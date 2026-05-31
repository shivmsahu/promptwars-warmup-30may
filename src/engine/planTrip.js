import { geocodeCity } from '../services/geocoding.js';
import { fetchPOIs } from '../services/poi.js';
import { getRoutingMatrix, getRoutePolyline } from '../services/routing.js';
import { getWeatherForecast } from '../services/weather.js';
import { clusterPOIs } from './clustering.js';
import { computeTotalTravelMinutes } from '../utils/poiMeta.js';

/**
 * Orchestrates the full trip-planning pipeline.
 */
export async function planTrip({
  destination,
  radarKey = '',
  orsKey = '',
  radiusKm = 5,
  daysCount = 3,
  onStage = () => {},
}) {
  onStage('Geocoding Destination');
  const location = await geocodeCity(destination, radarKey);
  if (!location) {
    throw new Error('Could not find destination. Try a different city.');
  }

  onStage('Fetching Local Weather');
  const weather = await getWeatherForecast(location.lat, location.lon);

  onStage('Discovering Local Gems');
  const pois = await fetchPOIs(location.lat, location.lon, radiusKm * 1000, 15);
  if (pois.length === 0) {
    throw new Error('No points of interest found in this area. Try increasing search radius.');
  }

  onStage('Calculating Route Matrix');
  const matrix = await getRoutingMatrix(pois, orsKey);

  onStage('Optimizing Daily Itinerary');
  const dailyItinerary = clusterPOIs(pois, matrix, daysCount, weather);

  onStage('Generating Precision Paths');
  const itineraries = await Promise.all(
    dailyItinerary.map(async (dayPOIs, index) => {
      if (dayPOIs.length > 1) {
        try {
          dayPOIs.routeGeometry = await getRoutePolyline(dayPOIs, orsKey);
        } catch (routeErr) {
          console.error(`Route generation failed for day ${index + 1}:`, routeErr);
          dayPOIs.routeGeometry = null;
        }
      } else {
        dayPOIs.routeGeometry = null;
      }
      return dayPOIs;
    })
  );

  const totalTime = computeTotalTravelMinutes(itineraries, pois, matrix);

  onStage('done');

  return { location, weather, pois, itineraries, totalTime };
}
