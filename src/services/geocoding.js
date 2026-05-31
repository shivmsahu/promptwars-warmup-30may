import axios from 'axios';

/**
 * Geocodes a city name using Radar.io or OpenStreetMap Nominatim API (Free, no key required).
 * @param {string} query - The city name or location to search for.
 * @param {string} [radarApiKey] - Optional Radar.io API key.
 * @returns {Promise<{lat: number, lon: number, name: string}|null>}
 */
export async function geocodeCity(query, radarApiKey = '') {
  // If API key is provided, try Radar.io first
  if (radarApiKey && radarApiKey.trim() !== '') {
    try {
      const response = await axios.get('https://api.radar.io/v1/search/autocomplete', {
        params: {
          query: query,
          limit: 1
        },
        headers: {
          'Authorization': radarApiKey.trim()
        }
      });

      if (response.data && response.data.addresses && response.data.addresses.length > 0) {
        const address = response.data.addresses[0];
        return {
          lat: address.latitude,
          lon: address.longitude,
          name: address.formattedAddress || address.placeLabel || query
        };
      }
    } catch (radarError) {
      console.warn('Radar.io geocoding failed or was unauthorized, falling back to Nominatim:', radarError);
    }
  }

  // Fallback to OSM Nominatim API
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'AI-Travel-Planner-POC/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        name: result.display_name
      };
    }
    return null;
  } catch (error) {
    console.error('Error geocoding city with Nominatim:', error);
    throw error;
  }
}

