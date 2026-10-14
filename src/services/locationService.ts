import { getToken } from './secureStorage';

const API_BASE_URL = 'https://quickcart-bxod.onrender.com/api';

interface ReverseGeocodeResponse {
  success: boolean;
  message?: string;
  data?: {
    display_name?: string;
    name?: string;
    address?: Record<string, string | undefined>;
  };
}

/**
 * Reverse-geocodes device coordinates through the QuickCart backend.
 * The backend makes the Nominatim request with a server-side identifying
 * User-Agent, avoiding direct requests from React Native to the public service.
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

  const token = await getToken();
  if (!token) {
    throw new Error('Please sign in to look up your current address.');
  }

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
  });

  const response = await fetch(
    `${API_BASE_URL}/location/reverse?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(
      `Address lookup failed (${response.status})` +
        (details ? `: ${details.slice(0, 200)}` : ''),
    );
  }

  const payload = (await response.json()) as ReverseGeocodeResponse;
  const result = payload.data;
  if (!payload.success || !result) return null;

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
    address.city || address.town || address.village || address.state_district;

  const label = [locality, city]
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(', ');

  if (label) return label;
  if (result.name?.trim()) return result.name.trim();
  if (result.display_name?.trim()) {
    return result.display_name.split(',').slice(0, 3).join(',').trim();
  }
  return null;
};
