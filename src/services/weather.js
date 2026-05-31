import axios from 'axios';

/**
 * Fetches weather forecast for the given coordinates using Open-Meteo API (Free, no key).
 * @param {number} lat 
 * @param {number} lon 
 * @returns {Promise<Array>} Array of daily weather forecasts
 */
export async function getWeatherForecast(lat, lon) {
  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        daily: 'temperature_2m_max,temperature_2m_min,weathercode',
        timezone: 'auto'
      }
    });

    if (response.data && response.data.daily) {
      const daily = response.data.daily;
      return daily.time.map((date, index) => ({
        date,
        maxTemp: daily.temperature_2m_max[index],
        minTemp: daily.temperature_2m_min[index],
        weatherCode: daily.weathercode[index]
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching weather:', error);
    return [];
  }
}

/**
 * Helper to map Open-Meteo WMO weather codes to a human-readable string/icon
 */
export function interpretWeatherCode(code) {
  if (code === 0) return { label: 'Clear sky', icon: 'Sun' };
  if (code >= 1 && code <= 3) return { label: 'Partly cloudy', icon: 'Cloud' };
  if (code >= 45 && code <= 48) return { label: 'Fog', icon: 'CloudFog' };
  if (code >= 51 && code <= 67) return { label: 'Rain', icon: 'CloudRain' };
  if (code >= 71 && code <= 82) return { label: 'Snow', icon: 'CloudSnow' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'CloudLightning' };
  return { label: 'Unknown', icon: 'Cloud' };
}
