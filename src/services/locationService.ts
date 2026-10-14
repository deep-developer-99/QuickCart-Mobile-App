import { getToken } from './secureStorage';

const API_BASE_URL = 'https://quickcart-bxod.onrender.com/api';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

interface ReverseGeocodeResponse {
  success?: boolean;
  message?: string;
  data?: NominatimResult;
}

interface NominatimResult {
  display_name?: string;
  name?: string;
  address?: Record<string, string | undefined>;
}

const toReadableLocation = (result?: NominatimResult | null): string | null => {
  if (!result) return null;

  const address = result.address ?? {};
  const locality =
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.quarter ||
    address.village ||
    address.town ||
    address.city_district ||
    address.city ||
    address.county;
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.state_district ||
    address.county;

  const label = [locality, city]
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(', ');

  if (label) return label;
  if (result.name?.trim()) return result.name.trim();
  if (result.display_name?.trim()) {
    return result.display_name.split(',').slice(0, 3).join(',').trim();
  }
  return null;
};

/**
 * First uses QuickCart's backend reverse-geocoding endpoint. If the deployed
 * backend does not yet expose that route (404) or is temporarily unavailable,
 * it falls back to OpenStreetMap Nominatim so the app can show an address
 * instead of raw coordinates. Never use the returned address as proof of a
 * user's delivery eligibility; validate delivery addresses separately.
 */
export const reverseGeocodeCoordinates = async (
  latitude: number,
  longitude: number,
): Promise<string | null> => {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Invalid latitude or longitude coordinates.');
  }

  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
    zoom: '18',
    addressdetails: '1',
  });

  // Try the backend first when the user has a token.
  try {
    const token = await getToken();
    if (token) {
      const backendResponse = await fetch(
        `${API_BASE_URL}/location/reverse?lat=${encodeURIComponent(
          String(latitude),
        )}&lon=${encodeURIComponent(String(longitude))}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (backendResponse.ok) {
        const payload =
          (await backendResponse.json()) as ReverseGeocodeResponse;
        const label = payload.success ? toReadableLocation(payload.data) : null;
        if (label) return label;
      } else {
        // A 404 commonly means the currently deployed backend is older than
        // the mobile app. Fall through to the direct geocoder request below.
        console.warn(
          `QuickCart reverse-geocoding endpoint returned ${backendResponse.status}; trying address provider fallback.`,
        );
      }
    }
  } catch (error) {
    console.warn(
      'QuickCart reverse-geocoding endpoint unavailable; using fallback.',
      error,
    );
  }

  // React Native is not subject to browser CORS restrictions. Identify the app
  // in the request and keep this fallback limited to an explicit user action.
  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'QuickCartMobile/1.0 (location lookup)',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Address lookup failed (${response.status}). Please try again.`,
    );
  }

  const result = (await response.json()) as NominatimResult;
  return toReadableLocation(result);
};
