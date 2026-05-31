import axios from 'axios';

/**
 * Fetches POIs (attractions, museums, parks, restaurants, cafes) around a given coordinate using Overpass API.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radius - Search radius in meters (default 5000)
 * @returns {Promise<Array>}
 */
export async function fetchPOIs(lat, lon, radius = 5000) {
  // Overpass QL to find interesting places (tourism, historic, leisure=park, amenity=restaurant/cafe)
  // We fetch a bit more than 15 to filter and rank the best POIs
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"="museum"](around:${radius},${lat},${lon});
      node["tourism"="attraction"](around:${radius},${lat},${lon});
      node["historic"="monument"](around:${radius},${lat},${lon});
      node["leisure"="park"](around:${radius},${lat},${lon});
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      node["amenity"="cafe"](around:${radius},${lat},${lon});
    );
    out center 40;
  `;

  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data && response.data.elements) {
      // Filter out elements without a name and format them
      return response.data.elements
        .filter(el => el.tags && el.tags.name)
        .map(el => {
          const category = el.tags.tourism || el.tags.historic || el.tags.leisure || el.tags.amenity || 'poi';
          return {
            id: el.id,
            name: el.tags.name,
            category: category,
            lat: el.lat || (el.center && el.center.lat),
            lon: el.lon || (el.center && el.center.lon),
            openingHours: el.tags.opening_hours || 'Varies',
            website: el.tags.website || el.tags.contact?.website || null,
            cuisine: el.tags.cuisine || null,
            wheelchair: el.tags.wheelchair || null
          };
        })
        .filter(poi => poi.lat && poi.lon); // ensure we have coordinate tags
    }
    return [];
  } catch (error) {
    console.error('Error fetching POIs from Overpass:', error);
    throw error;
  }
}

