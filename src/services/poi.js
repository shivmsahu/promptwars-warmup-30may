import axios from 'axios';
import { selectDiversePOIs } from '../utils/poiSelection.js';

/**
 * Fetches POIs around a coordinate using Overpass API, then returns a category-balanced subset.
 * @param {number} lat
 * @param {number} lon
 * @param {number} radius - meters
 * @param {number} limit - max POIs to return
 * @returns {Promise<Array>}
 */
export async function fetchPOIs(lat, lon, radius = 5000, limit = 15) {
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"="museum"](around:${radius},${lat},${lon});
      node["tourism"="attraction"](around:${radius},${lat},${lon});
      node["tourism"="gallery"](around:${radius},${lat},${lon});
      node["tourism"="viewpoint"](around:${radius},${lat},${lon});
      node["tourism"="theme_park"](around:${radius},${lat},${lon});
      node["historic"="monument"](around:${radius},${lat},${lon});
      node["historic"="memorial"](around:${radius},${lat},${lon});
      node["historic"="castle"](around:${radius},${lat},${lon});
      node["leisure"="park"](around:${radius},${lat},${lon});
      node["leisure"="garden"](around:${radius},${lat},${lon});
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      node["amenity"="cafe"](around:${radius},${lat},${lon});
      node["amenity"="bar"](around:${radius},${lat},${lon});
      node["amenity"="theatre"](around:${radius},${lat},${lon});
      node["amenity"="marketplace"](around:${radius},${lat},${lon});
      node["amenity"="place_of_worship"](around:${radius},${lat},${lon});
    );
    out center 80;
  `;

  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data?.elements) {
      const pois = response.data.elements
        .filter((el) => el.tags?.name)
        .map((el) => {
          const category = el.tags.tourism
            || el.tags.historic
            || el.tags.leisure
            || el.tags.amenity
            || 'poi';

          return {
            id: el.id,
            name: el.tags.name,
            category,
            lat: el.lat || el.center?.lat,
            lon: el.lon || el.center?.lon,
            openingHours: el.tags.opening_hours || 'Varies',
            website: el.tags.website || el.tags.contact?.website || null,
            cuisine: el.tags.cuisine || null,
            wheelchair: el.tags.wheelchair || null,
          };
        })
        .filter((poi) => poi.lat && poi.lon);

      return selectDiversePOIs(pois, limit);
    }

    return [];
  } catch (error) {
    console.error('Error fetching POIs from Overpass:', error);
    throw error;
  }
}
