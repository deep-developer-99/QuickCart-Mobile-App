/**
 * Reverse-geocodes device GPS coordinates into a short, readable area label.
 * Uses OpenStreetMap Nominatim; this is intentionally called only after a user tap.
 */
export const reverseGeocodeCoordinates = async (
  latitude: number,
  longitude: number,
): Promise<string | null> => {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${encodeURIComponent(latitude)}` +
    `&lon=${encodeURIComponent(longitude)}` +
    '&zoom=18&addressdetails=1';

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with status ${response.status}`);
  }

  const result = (await response.json()) as {
    name?: string;
    display_name?: string;
    address?: Record<string, string | undefined>;
  };
  const address = result.address ?? {};
  const locality =
    address.suburb ||
    address.neighbourhood ||
    address.residential ||
    address.village ||
    address.town ||
    address.city_district ||
    address.city ||
    address.county;
  const city =
    address.city || address.town || address.village || address.state_district;
  const label = [locality, city]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(', ');

  if (label) return label;
  if (result.name) return result.name;
  if (result.display_name)
    return result.display_name.split(',').slice(0, 3).join(',').trim();
  return null;
};
