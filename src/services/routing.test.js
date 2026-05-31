import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { getRoutingMatrix, getRoutePolyline } from './routing.js';

vi.mock('axios');

const coords = [{ lat: 1, lon: 2 }, { lat: 1.1, lon: 2.1 }];

describe('routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses ORS matrix when key is provided', async () => {
    axios.post.mockResolvedValue({ data: { durations: [[0, 100], [100, 0]] } });
    const matrix = await getRoutingMatrix(coords, 'ors-key');
    expect(matrix).toEqual([[0, 100], [100, 0]]);
  });

  it('falls back to OSRM matrix when ORS fails', async () => {
    axios.post.mockRejectedValueOnce(new Error('ors fail'));
    axios.get.mockResolvedValue({ data: { code: 'Ok', durations: [[0, 200], [200, 0]] } });

    const matrix = await getRoutingMatrix(coords, 'bad-key');
    expect(matrix[0][1]).toBe(200);
  });

  it('uses haversine fallback matrix when OSRM fails', async () => {
    axios.get.mockRejectedValue(new Error('osrm fail'));
    const matrix = await getRoutingMatrix(coords);
    expect(matrix[0][0]).toBe(0);
    expect(matrix[0][1]).toBeGreaterThan(0);
  });

  it('returns empty polyline for fewer than two points', async () => {
    expect(await getRoutePolyline([coords[0]])).toEqual([]);
  });

  it('uses ORS directions when key is provided', async () => {
    axios.post.mockResolvedValue({
      data: { features: [{ geometry: { coordinates: [[2, 1], [2.1, 1.1]] } }] },
    });
    const path = await getRoutePolyline(coords, 'ors-key');
    expect(path).toHaveLength(2);
  });

  it('falls back to OSRM route geometry', async () => {
    axios.post.mockRejectedValueOnce(new Error('ors fail'));
    axios.get.mockResolvedValue({
      data: { code: 'Ok', routes: [{ geometry: { coordinates: [[2, 1], [2.1, 1.1]] } }] },
    });
    const path = await getRoutePolyline(coords, 'bad-key');
    expect(path).toHaveLength(2);
  });

  it('returns empty array when route APIs fail', async () => {
    axios.get.mockRejectedValue(new Error('fail'));
    expect(await getRoutePolyline(coords)).toEqual([]);
  });
});
