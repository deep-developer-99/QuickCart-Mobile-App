import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { getToken } from './secureStorage';

const API_BASE_URL = 'https://quickcart-bxod.onrender.com/api';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface ReverseGeocodedAddress {
  formattedAddress: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}

export interface LocationSearchResult extends ReverseGeocodedAddress {
  latitude: number;
  longitude: number;
  displayAddress: string;
}

export interface NearbyLandmark {
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

export interface ResolvedLocation {
  formattedAddress: string | null;
  address: ReverseGeocodedAddress | null;
  nearestLandmark: NearbyLandmark | null;
  landmarks: NearbyLandmark[];
}

interface ReverseGeocodeResponse {
  success?: boolean;
  message?: string;
  data?: NominatimResult | ResolvedLocation;
}

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  address?: Record<string, string | undefined>;
}

const searchCache = new Map<string, LocationSearchResult[]>();
let lastSearchAt = 0;
const reverseCache = new Map<string, ReverseGeocodedAddress | null>();
const landmarkCache = new Map<string, { value: NearbyLandmark[]; expiresAt: number }>();
let lastLandmarkRequestAt = 0;
const LOCATION_CACHE_TTL = 5 * 60 * 1000;
const LOCATION_RADIUS_METERS = 1200;
const MAX_RELIABLE_LANDMARK_DISTANCE_METERS = 1000;

const coordinateKey = (latitude: number, longitude: number): string =>
  `${latitude.toFixed(5)},${longitude.toFixed(5)}`;

const fetchWithTimeout = async (
  input: RequestInfo,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      fetch(input, init),
      new Promise<Response>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Location request timed out.')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

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

  if (result.display_name?.trim()) {
    return result.display_name.trim();
  }
  if (label) return label;
  if (result.name?.trim()) return result.name.trim();
  return null;
};

const toReverseGeocodedAddress = (
  result?: NominatimResult | null,
): ReverseGeocodedAddress | null => {
  if (!result) return null;

  const address = result.address ?? {};
  const road = address.road || address.pedestrian || address.footway || null;
  const houseNumber = address.house_number || null;
  const locality =
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.village ||
    address.town ||
    address.city_district ||
    null;

  return {
    formattedAddress: toReadableLocation(result),
    addressLine:
      [houseNumber, road, locality]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(', ') || null,
    city:
      address.city ||
      address.town ||
      address.village ||
      address.state_district ||
      address.county ||
      null,
    state: address.state || null,
    pincode: address.postcode || null,
  };
};

const toLocationSearchResult = (
  result: NominatimResult,
): LocationSearchResult | null => {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  const address = toReverseGeocodedAddress(result);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !result.display_name
  ) {
    return null;
  }
  return {
    latitude,
    longitude,
    displayAddress: result.display_name,
    formattedAddress: address?.formattedAddress ?? result.display_name,
    addressLine: address?.addressLine ?? null,
    city: address?.city ?? null,
    state: address?.state ?? null,
    pincode: address?.pincode ?? null,
  };
};

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  const permission = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Allow QuickCart to access your location',
      message:
        'Your location helps us show the area you want your order delivered to.',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    },
  );

  return permission === PermissionsAndroid.RESULTS.GRANTED;
};

export const getCurrentLocation = (): Promise<LocationCoordinates> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      reject,
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
        forceRequestLocation: true,
      },
    );
  });

const fetchReverseGeocodeResult = async (
  latitude: number,
  longitude: number,
): Promise<NominatimResult | null> => {
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
      const backendResponse = await fetchWithTimeout(
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
        10000,
      );

      if (backendResponse.ok) {
        const payload =
          (await backendResponse.json()) as ReverseGeocodeResponse;
        if (
          payload.success &&
          payload.data &&
          !('landmarks' in payload.data)
        ) {
          return payload.data;
        }
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
  const response = await fetchWithTimeout(`${NOMINATIM_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'QuickCartMobile/1.0 (location lookup)',
    },
  }, 10000);

  if (!response.ok) {
    throw new Error(
      `Address lookup failed (${response.status}). Please try again.`,
    );
  }

  return (await response.json()) as NominatimResult;
};

/**
 * First uses QuickCart's backend reverse-geocoding endpoint. If the deployed
 * backend does not expose that route or is temporarily unavailable, it falls
 * back to OpenStreetMap Nominatim.
 */
export const reverseGeocodeCoordinates = async (
  latitude: number,
  longitude: number,
): Promise<string | null> => toReadableLocation(await fetchReverseGeocodeResult(latitude, longitude));

export const reverseGeocodeAddress = async (
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodedAddress | null> => {
  const key = coordinateKey(latitude, longitude);
  const cached = reverseCache.get(key);
  if (cached !== undefined) return cached;
  const value = toReverseGeocodedAddress(
    await fetchReverseGeocodeResult(latitude, longitude),
  );
  reverseCache.set(key, value);
  return value;
};

/**
 * Searches OpenStreetMap's public Nominatim endpoint for an explicit user
 * query. Callers should debounce input and only invoke this after the user
 * has entered a meaningful query. Results are cached in-memory for this app
 * session to avoid repeating identical lookups.
 */
export const searchLocationSuggestions = async (
  query: string,
): Promise<LocationSearchResult[]> => {
  const normalizedQuery = query.trim().replace(/\s+/g, ' ');
  if (normalizedQuery.length < 3) return [];

  const cacheKey = normalizedQuery.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  // Keep explicit searches spaced even if a caller changes its debounce.
  const wait = Math.max(0, 1000 - (Date.now() - lastSearchAt));
  if (wait > 0) await new Promise<void>(resolve => setTimeout(resolve, wait));
  lastSearchAt = Date.now();

  const params = new URLSearchParams({
    q: normalizedQuery,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
  });
  const response = await fetchWithTimeout(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'QuickCartMobile/1.0 (location search)',
    },
  }, 10000);
  if (!response.ok) throw new Error(`Location search failed (${response.status}).`);

  const results = ((await response.json()) as NominatimResult[])
    .map(toLocationSearchResult)
    .filter((result): result is LocationSearchResult => result !== null);
  searchCache.set(cacheKey, results);
  return results;
};

const landmarkCategory = (tags: Record<string, string | undefined>): string | null => {
  if (tags.railway === 'station' || tags.station === 'subway') return 'Metro or train station';
  if (tags.highway === 'bus_stop' || tags.public_transport === 'platform' || tags.public_transport === 'stop_position') return 'Bus stop';
  if (tags.amenity === 'hospital' || tags.healthcare === 'hospital') return 'Hospital';
  if (tags.amenity === 'clinic' || tags.healthcare === 'clinic') return 'Clinic';
  if (tags.amenity === 'school') return 'School';
  if (tags.amenity === 'college' || tags.amenity === 'university') return 'College or university';
  if (tags.amenity === 'place_of_worship' || tags.religion) return 'Place of worship';
  if (tags.shop === 'mall' || tags.shop === 'supermarket') return 'Mall or supermarket';
  if (tags.amenity === 'marketplace' || tags.shop) return 'Market or shop';
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'Park';
  if (tags.building) return 'Named building';
  return null;
};

const distanceBetween = (latitude: number, longitude: number, otherLatitude: number, otherLongitude: number): number => {
  const earthRadius = 6371000;
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(otherLatitude - latitude);
  const dLon = radians(otherLongitude - longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(otherLatitude)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getNearbyLandmarks = async (
  latitude: number,
  longitude: number,
): Promise<NearbyLandmark[]> => {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return [];
  }
  const cacheKey = coordinateKey(latitude, longitude);
  const cached = landmarkCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const wait = Math.max(0, 1100 - (Date.now() - lastLandmarkRequestAt));
  if (wait > 0) await new Promise<void>(resolve => setTimeout(resolve, wait));
  lastLandmarkRequestAt = Date.now();
  const query = `[out:json][timeout:12];(nwr(around:${LOCATION_RADIUS_METERS},${latitude},${longitude})["name"]["amenity"~"hospital|clinic|school|college|university|marketplace|place_of_worship"];nwr(around:${LOCATION_RADIUS_METERS},${latitude},${longitude})["name"]["public_transport"];nwr(around:${LOCATION_RADIUS_METERS},${latitude},${longitude})["name"]["railway"~"station|subway_entrance"];nwr(around:${LOCATION_RADIUS_METERS},${latitude},${longitude})["name"]["highway"="bus_stop"];nwr(around:${LOCATION_RADIUS_METERS},${latitude},${longitude})["name"]["shop"];nwr(around:${LOCATION_RADIUS_METERS},${latitude},${longitude})["name"]["leisure"~"park|garden"];nwr(around:${LOCATION_RADIUS_METERS},${latitude},${longitude})["name"]["building"];);out center tags;`;
  const response = await fetchWithTimeout('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'text/plain' },
    body: query,
  }, 15000);
  if (!response.ok) throw new Error(`Nearby places lookup failed (${response.status}).`);
  const payload = (await response.json()) as { elements?: Array<{ lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: Record<string, string | undefined> }> };
  const unique = new Map<string, NearbyLandmark>();
  for (const element of payload.elements ?? []) {
    const tags = element.tags ?? {};
    const name = tags.name?.trim();
    const category = landmarkCategory(tags);
    const point = element.lat !== undefined && element.lon !== undefined ? element : element.center;
    if (!name || !category || point?.lat === undefined || point.lon === undefined) continue;
    const distanceMeters = distanceBetween(latitude, longitude, point.lat, point.lon);
    if (distanceMeters > LOCATION_RADIUS_METERS) continue;
    const key = name.toLowerCase().replace(/\s+/g, ' ');
    const candidate = { name, category, latitude: point.lat, longitude: point.lon, distanceMeters };
    const existing = unique.get(key);
    if (!existing || candidate.distanceMeters < existing.distanceMeters) unique.set(key, candidate);
  }
  const result = [...unique.values()].sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 8);
  landmarkCache.set(cacheKey, { value: result, expiresAt: Date.now() + LOCATION_CACHE_TTL });
  return result;
};

const selectNearestLandmark = (
  landmarks: NearbyLandmark[],
): NearbyLandmark | null => {
  const candidate = landmarks.find(
    landmark => landmark.distanceMeters <= MAX_RELIABLE_LANDMARK_DISTANCE_METERS,
  );
  return candidate ?? null;
};

export const resolveLocation = async (
  latitude: number,
  longitude: number,
): Promise<ResolvedLocation> => {
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

  try {
    const token = await getToken();
    if (token) {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/location/resolve?lat=${encodeURIComponent(
          String(latitude),
        )}&lon=${encodeURIComponent(String(longitude))}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
        12000,
      );
      if (response.ok) {
        const payload = (await response.json()) as {
          success?: boolean;
          data?: ResolvedLocation;
        };
        if (payload.success && payload.data?.landmarks) {
          return payload.data;
        }
      }
    }
  } catch (error) {
    console.warn('Combined location endpoint unavailable; using OSM fallback.', error);
  }

  const [addressResult, landmarkResult] = await Promise.allSettled([
    reverseGeocodeAddress(latitude, longitude),
    getNearbyLandmarks(latitude, longitude),
  ]);
  const address =
    addressResult.status === 'fulfilled' ? addressResult.value : null;
  const landmarks =
    landmarkResult.status === 'fulfilled' ? landmarkResult.value : [];
  return {
    formattedAddress: address?.formattedAddress ?? null,
    address,
    landmarks,
    nearestLandmark: selectNearestLandmark(landmarks),
  };
};
