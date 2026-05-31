import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { fetchPOIs } from './poi.js';

vi.mock('axios');

describe('fetchPOIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps Overpass elements to POI objects', async () => {
    axios.post.mockResolvedValue({
      data: {
        elements: [
          { id: 1, lat: 1, lon: 2, tags: { name: 'Museum', tourism: 'museum', opening_hours: '09-17', website: 'https://x.com' } },
          { id: 2, lat: 3, lon: 4, tags: { name: 'Park', leisure: 'park' } },
          { id: 3, tags: { tourism: 'attraction' } },
        ],
      },
    });

    const pois = await fetchPOIs(1, 2, 5000, 10);
    expect(pois.length).toBeGreaterThan(0);
    expect(pois[0]).toMatchObject({ id: 1, name: 'Museum', category: 'museum', website: 'https://x.com' });
  });

  it('returns empty array when no elements', async () => {
    axios.post.mockResolvedValue({ data: {} });
    expect(await fetchPOIs(1, 2)).toEqual([]);
  });

  it('throws on network error', async () => {
    axios.post.mockRejectedValue(new Error('timeout'));
    await expect(fetchPOIs(1, 2)).rejects.toThrow('timeout');
  });
});
