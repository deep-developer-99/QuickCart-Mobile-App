import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { getToken } from './secureStorage';
import {
  getApiErrorDiagnostics,
  logApiDiagnostic,
  safeApiPath,
} from './apiDiagnostics';

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

export interface ResolvedLocation {
  formattedAddress: string | null;
  address: ReverseGeocodedAddress | null;
}

interface ReverseGeocodeResponse {
  success?: boolean;
  message?: string;
  data?: NominatimResult;
}

interface ForwardGeocodeResponse {
  success?: boolean;
  code?: ForwardGeocodeErrorCode;
  data?: LocationCoordinates & { displayName?: string | null };
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
const forwardCache = new Map<string, LocationCoordinates>();
const forwardRequests = new Map<string, Promise<LocationCoordinates>>();

export type ForwardGeocodeErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'AUTHENTICATION_REQUIRED'
  | 'PROVIDER_ERROR';

export class ForwardGeocodeError extends Error {
  constructor(public readonly code: ForwardGeocodeErrorCode) {
    super(code);
    this.name = 'ForwardGeocodeError';
  }
}

const coordinateKey = (latitude: number, longitude: number): string =>
  `${latitude.toFixed(5)},${longitude.toFixed(5)}`;

export const isValidLocationCoordinates = (
  value: unknown,
): value is LocationCoordinates => {
  if (!value || typeof value !== 'object') return false;
  const coordinate = value as Partial<LocationCoordinates>;
  return (
    typeof coordinate.latitude === 'number' &&
    typeof coordinate.longitude === 'number' &&
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  );
};

export const forwardGeocodeAddress = async (
  address: string,
): Promise<LocationCoordinates> => {
  const normalizedAddress = address.trim().replace(/\s+/g, ' ');
  if (normalizedAddress.length < 5 || normalizedAddress.length > 500) {
    throw new ForwardGeocodeError('INVALID_INPUT');
  }
  const key = normalizedAddress.toLocaleLowerCase('en-IN');
  const cached = forwardCache.get(key);
  if (cached) return cached;
  const pending = forwardRequests.get(key);
  if (pending) return pending;

  const request = (async () => {
    let token: string | null;
    try {
      token = await getToken();
    } catch {
      logApiDiagnostic('warn', 'request.skipped', {
        operation: 'location.forward',
        method: 'POST',
        path: '/location/forward',
        baseUrlConfigured: Boolean(API_BASE_URL),
        errorCategory: 'credential_lookup_failed',
        authPresent: null,
      });
      throw new ForwardGeocodeError('PROVIDER_ERROR');
    }
    if (!token) {
      logApiDiagnostic('warn', 'request.skipped', {
        operation: 'location.forward',
        method: 'POST',
        path: '/location/forward',
        baseUrlConfigured: Boolean(API_BASE_URL),
        errorCategory: 'authentication_required',
        authPresent: false,
      });
      throw new ForwardGeocodeError('PROVIDER_ERROR');
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${API_BASE_URL}/location/forward`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ address: normalizedAddress }),
        },
        12000,
        'location.forward',
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        throw new ForwardGeocodeError('TIMEOUT');
      }
      throw new ForwardGeocodeError('PROVIDER_ERROR');
    }

    let payload: ForwardGeocodeResponse;
    try {
      payload = (await response.json()) as ForwardGeocodeResponse;
    } catch {
      if (response.status === 429) {
        throw new ForwardGeocodeError('RATE_LIMITED');
      }
      if (response.status === 504) throw new ForwardGeocodeError('TIMEOUT');
      throw new ForwardGeocodeError('PROVIDER_ERROR');
    }
    if (!response.ok || !payload.success) {
      const code = payload.code;
      if (
        code === 'INVALID_INPUT' ||
        code === 'NOT_FOUND' ||
        code === 'RATE_LIMITED' ||
        code === 'TIMEOUT' ||
        code === 'PROVIDER_ERROR'
      ) {
        throw new ForwardGeocodeError(code);
      }
      if (response.status === 404) throw new ForwardGeocodeError('NOT_FOUND');
      if (response.status === 429) {
        throw new ForwardGeocodeError('RATE_LIMITED');
      }
      if (response.status === 504) throw new ForwardGeocodeError('TIMEOUT');
      if (response.status === 401 || response.status === 403) {
        throw new ForwardGeocodeError('AUTHENTICATION_REQUIRED');
      }
      throw new ForwardGeocodeError('PROVIDER_ERROR');
    }
    if (!isValidLocationCoordinates(payload.data)) {
      throw new ForwardGeocodeError('PROVIDER_ERROR');
    }
    const coordinate = {
      latitude: payload.data.latitude,
      longitude: payload.data.longitude,
    };
    forwardCache.set(key, coordinate);
    if (forwardCache.size > 100) {
      const oldestKey = forwardCache.keys().next().value;
      if (oldestKey) forwardCache.delete(oldestKey);
    }
    return coordinate;
  })();
  forwardRequests.set(key, request);
  try {
    return await request;
  } finally {
    forwardRequests.delete(key);
  }
};

const fetchWithTimeout = async (
  input: RequestInfo,
  init: RequestInit,
  timeoutMs: number,
  operation: string,
): Promise<Response> => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const requestUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
  const requestPath = (() => {
    try {
      return safeApiPath(new URL(requestUrl).pathname);
    } catch {
      return '/';
    }
  })();
  const requestInfo = {
    operation,
    method: init.method ?? 'GET',
    path: requestPath,
    ...(requestUrl.startsWith(API_BASE_URL)
      ? { baseUrlConfigured: Boolean(API_BASE_URL) }
      : {}),
    authPresent: new Headers(init.headers).has('authorization'),
  };
  const startedAt = Date.now();
  logApiDiagnostic('info', 'request.start', requestInfo);

  try {
    const response = await Promise.race([
      fetch(input, init),
      new Promise<Response>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Location request timed out.')),
          timeoutMs,
        );
      }),
    ]);
    logApiDiagnostic('info', 'request.complete', {
      ...requestInfo,
      httpStatus: response.status,
      success: response.ok,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    const details = getApiErrorDiagnostics({
      status:
        error instanceof Error && /timed out/i.test(error.message)
          ? 'TIMEOUT_ERROR'
          : 'FETCH_ERROR',
      error: error instanceof Error ? error.message : '',
    });
    logApiDiagnostic('warn', 'request.failed', {
      ...requestInfo,
      ...details,
      durationMs: Date.now() - startedAt,
    });
    throw error;
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
  let backendRequestAttempted = false;
  try {
    const token = await getToken();
    if (token) {
      backendRequestAttempted = true;
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
        'location.reverse',
      );

      if (backendResponse.ok) {
        const payload =
          (await backendResponse.json()) as ReverseGeocodeResponse;
        if (
          payload.success &&
          payload.data
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
    } else {
      logApiDiagnostic('info', 'request.skipped', {
        operation: 'location.reverse',
        method: 'GET',
        path: '/location/reverse',
        baseUrlConfigured: Boolean(API_BASE_URL),
        errorCategory: 'authentication_required',
        authPresent: false,
      });
    }
  } catch {
    if (!backendRequestAttempted) {
      logApiDiagnostic('warn', 'request.skipped', {
        operation: 'location.reverse',
        method: 'GET',
        path: '/location/reverse',
        baseUrlConfigured: Boolean(API_BASE_URL),
        errorCategory: 'credential_lookup_failed',
        authPresent: null,
      });
    }
    console.warn(
      'QuickCart reverse-geocoding endpoint unavailable; using fallback.',
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
  }, 10000, 'nominatim.reverse');

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
  }, 10000, 'nominatim.search');
  if (!response.ok) throw new Error(`Location search failed (${response.status}).`);

  const results = ((await response.json()) as NominatimResult[])
    .map(toLocationSearchResult)
    .filter((result): result is LocationSearchResult => result !== null);
  searchCache.set(cacheKey, results);
  return results;
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
  const address = await reverseGeocodeAddress(latitude, longitude);
  return {
    formattedAddress: address?.formattedAddress ?? null,
    address,
  };
};
