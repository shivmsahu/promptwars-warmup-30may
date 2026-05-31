import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { geocodeCity } from './geocoding.js';

vi.mock('axios');

describe('geocoding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses Radar.io when API key is provided', async () => {
    axios.get.mockResolvedValue({
      data: {
        addresses: [{ latitude: 48.8, longitude: 2.3, formattedAddress: 'Paris, France' }],
      },
    });

    const result = await geocodeCity('Paris', 'test-key');
    expect(result).toEqual({ lat: 48.8, lon: 2.3, name: 'Paris, France' });
    expect(axios.get).toHaveBeenCalledWith(
      'https://api.radar.io/v1/search/autocomplete',
      expect.objectContaining({ headers: { Authorization: 'test-key' } })
    );
  });

  it('falls back to Nominatim when Radar fails', async () => {
    axios.get
      .mockRejectedValueOnce(new Error('unauthorized'))
      .mockResolvedValueOnce({
        data: [{ lat: '28.6139', lon: '77.2090', display_name: 'New Delhi, India' }],
      });

    const result = await geocodeCity('Delhi', 'bad-key');
    expect(result.name).toContain('Delhi');
    expect(result.lat).toBeCloseTo(28.6139);
  });

  it('uses Nominatim when no Radar key is set', async () => {
    axios.get.mockResolvedValue({
      data: [{ lat: '51.5', lon: '-0.12', display_name: 'London' }],
    });

    const result = await geocodeCity('London');
    expect(result.name).toBe('London');
  });

  it('returns null when Nominatim finds nothing', async () => {
    axios.get.mockResolvedValue({ data: [] });
    expect(await geocodeCity('Nowhereville')).toBeNull();
  });

  it('throws when Nominatim request fails without Radar key', async () => {
    axios.get.mockRejectedValue(new Error('network'));
    await expect(geocodeCity('London')).rejects.toThrow('network');
  });
});
