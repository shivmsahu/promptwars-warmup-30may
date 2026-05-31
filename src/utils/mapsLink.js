/**
 * Builds a Google Maps URL without an API key.
 * Uses the official Maps URL scheme: https://developers.google.com/maps/documentation/urls
 */
export function getGoogleMapsUrl(poi) {
  const { lat, lon, name } = poi;
  const query = name ? `${name},${lat},${lon}` : `${lat},${lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
