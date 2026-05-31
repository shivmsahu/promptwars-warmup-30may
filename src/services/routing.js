import axios from 'axios';

/**
 * Calculates a routing matrix (durations) between a set of coordinates using OpenRouteService (ORS) or OSRM Public API.
 * @param {Array<{lat: number, lon: number}>} coordinates
 * @param {string} [orsApiKey] - Optional OpenRouteService API key
 * @returns {Promise<Array<Array<number>>>} - 2D array of durations in seconds
 */
export async function getRoutingMatrix(coordinates, orsApiKey = '') {
  if (orsApiKey && orsApiKey.trim() !== '') {
    try {
      const response = await axios.post(
        'https://api.openrouteservice.org/v1/matrix/driving-car',
        {
          locations: coordinates.map(c => [c.lon, c.lat]),
          metrics: ['duration']
        },
        {
          headers: {
            'Authorization': orsApiKey.trim(),
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.durations) {
        return response.data.durations;
      }
    } catch (orsError) {
      console.warn('OpenRouteService Matrix API failed, falling back to OSRM:', orsError);
    }
  }

  // Fallback: OSRM expects lon,lat;lon,lat
  const coordString = coordinates.map(c => `${c.lon},${c.lat}`).join(';');
  try {
    const response = await axios.get(`https://router.project-osrm.org/table/v1/driving/${coordString}`, {
      params: {
        annotations: 'duration'
      }
    });

    if (response.data && response.data.code === 'Ok') {
      return response.data.durations;
    }
    throw new Error('OSRM Matrix API returned non-OK status');
  } catch (error) {
    console.error('Error fetching routing matrix:', error);
    // Return fallback matrix (straight line distance proxy) if API fails
    return fallbackMatrix(coordinates);
  }
}

/**
 * Fetches the polyline route geometry between an ordered list of waypoints.
 * @param {Array<{lat: number, lon: number}>} routePoints
 * @param {string} [orsApiKey] - Optional OpenRouteService API key
 * @returns {Promise<Array<[number, number]>>} - Array of [lon, lat] coordinates for rendering
 */
export async function getRoutePolyline(routePoints, orsApiKey = '') {
  if (routePoints.length < 2) return [];

  if (orsApiKey && orsApiKey.trim() !== '') {
    try {
      const response = await axios.post(
        'https://api.openrouteservice.org/v1/directions/driving-car/geojson',
        {
          coordinates: routePoints.map(c => [c.lon, c.lat])
        },
        {
          headers: {
            'Authorization': orsApiKey.trim(),
            'Content-Type': 'application/json'
          }
        }
      );

      if (
        response.data &&
        response.data.features &&
        response.data.features.length > 0 &&
        response.data.features[0].geometry
      ) {
        return response.data.features[0].geometry.coordinates;
      }
    } catch (orsError) {
      console.warn('OpenRouteService Directions API failed, falling back to OSRM:', orsError);
    }
  }

  // Fallback: OSRM Route API
  const coordString = routePoints.map(c => `${c.lon},${c.lat}`).join(';');
  try {
    const response = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coordString}`, {
      params: {
        geometries: 'geojson',
        overview: 'full'
      }
    });

    if (response.data && response.data.code === 'Ok' && response.data.routes.length > 0) {
      return response.data.routes[0].geometry.coordinates;
    }
    return [];
  } catch (error) {
    console.error('Error fetching route polyline:', error);
    return [];
  }
}

// Simple fallback distance calculation (Haversine roughly)
function fallbackMatrix(coordinates) {
  const matrix = [];
  for (let i = 0; i < coordinates.length; i++) {
    const row = [];
    for (let j = 0; j < coordinates.length; j++) {
      if (i === j) {
        row.push(0);
      } else {
        const dx = coordinates[i].lon - coordinates[j].lon;
        const dy = coordinates[i].lat - coordinates[j].lat;
        const dist = Math.sqrt(dx*dx + dy*dy) * 111000;
        row.push(dist / 13.8); // duration in seconds
      }
    }
    matrix.push(row);
  }
  return matrix;
}

