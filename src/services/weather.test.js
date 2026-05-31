import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { getWeatherForecast, interpretWeatherCode } from './weather.js';

vi.mock('axios');

describe('weather', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps daily forecast from Open-Meteo', async () => {
    axios.get.mockResolvedValue({
      data: {
        daily: {
          time: ['2026-05-01'],
          temperature_2m_max: [30],
          temperature_2m_min: [20],
          weathercode: [0],
        },
      },
    });

    const forecast = await getWeatherForecast(1, 2);
    expect(forecast).toEqual([{ date: '2026-05-01', maxTemp: 30, minTemp: 20, weatherCode: 0 }]);
  });

  it('returns empty array on API failure', async () => {
    axios.get.mockRejectedValue(new Error('fail'));
    expect(await getWeatherForecast(1, 2)).toEqual([]);
  });

  it('returns empty array when daily data is missing', async () => {
    axios.get.mockResolvedValue({ data: {} });
    expect(await getWeatherForecast(1, 2)).toEqual([]);
  });

  it('interprets WMO weather codes', () => {
    expect(interpretWeatherCode(0).label).toBe('Clear sky');
    expect(interpretWeatherCode(2).label).toBe('Partly cloudy');
    expect(interpretWeatherCode(55).label).toBe('Rain');
    expect(interpretWeatherCode(71).label).toBe('Snow');
    expect(interpretWeatherCode(95).label).toBe('Thunderstorm');
    expect(interpretWeatherCode(10).label).toBe('Unknown');
  });
});
