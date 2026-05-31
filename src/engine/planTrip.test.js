import { describe, it, expect, vi, beforeEach } from 'vitest';
import { planTrip } from './planTrip.js';

vi.mock('../services/geocoding.js', () => ({
  geocodeCity: vi.fn(),
}));
vi.mock('../services/poi.js', () => ({
  fetchPOIs: vi.fn(),
}));
vi.mock('../services/routing.js', () => ({
  getRoutingMatrix: vi.fn(),
  getRoutePolyline: vi.fn(),
}));
vi.mock('../services/weather.js', () => ({
  getWeatherForecast: vi.fn(),
}));
vi.mock('./clustering.js', () => ({
  clusterPOIs: vi.fn(),
}));

import { geocodeCity } from '../services/geocoding.js';
import { fetchPOIs } from '../services/poi.js';
import { getRoutingMatrix, getRoutePolyline } from '../services/routing.js';
import { getWeatherForecast } from '../services/weather.js';
import { clusterPOIs } from './clustering.js';

describe('planTrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('orchestrates the planning pipeline', async () => {
    const stages = [];
    const location = { lat: 1, lon: 2, name: 'Paris' };
    const pois = [{ id: 'a' }, { id: 'b' }];
    const day = [{ id: 'a' }, { id: 'b' }];
    const matrix = [[0, 100], [100, 0]];

    geocodeCity.mockResolvedValue(location);
    getWeatherForecast.mockResolvedValue([{ weatherCode: 0 }]);
    fetchPOIs.mockResolvedValue(pois);
    getRoutingMatrix.mockResolvedValue(matrix);
    clusterPOIs.mockReturnValue([day]);
    getRoutePolyline.mockResolvedValue([[2, 1], [2.1, 1.1]]);

    const result = await planTrip({
      destination: 'Paris',
      onStage: (stage) => stages.push(stage),
    });

    expect(result.location).toEqual(location);
    expect(result.pois).toEqual(pois);
    expect(result.itineraries).toHaveLength(1);
    expect(stages).toContain('Geocoding Destination');
    expect(stages).toContain('done');
  });

  it('throws when destination cannot be geocoded', async () => {
    geocodeCity.mockResolvedValue(null);
    await expect(planTrip({ destination: 'Nowhere' })).rejects.toThrow('Could not find destination');
  });

  it('throws when no POIs are found', async () => {
    geocodeCity.mockResolvedValue({ lat: 1, lon: 2, name: 'X' });
    getWeatherForecast.mockResolvedValue([]);
    fetchPOIs.mockResolvedValue([]);
    await expect(planTrip({ destination: 'X' })).rejects.toThrow('No points of interest');
  });

  it('handles route generation failure gracefully', async () => {
    geocodeCity.mockResolvedValue({ lat: 1, lon: 2, name: 'X' });
    getWeatherForecast.mockResolvedValue([]);
    fetchPOIs.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    getRoutingMatrix.mockResolvedValue([[0, 1], [1, 0]]);
    clusterPOIs.mockReturnValue([[{ id: 'a' }, { id: 'b' }]]);
    getRoutePolyline.mockRejectedValue(new Error('route fail'));

    const result = await planTrip({ destination: 'X' });
    expect(result.itineraries[0].routeGeometry).toBeNull();
  });
});
