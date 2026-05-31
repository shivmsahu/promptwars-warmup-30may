import { describe, it, expect } from 'vitest';
import { getGoogleMapsUrl } from './mapsLink.js';

describe('mapsLink', () => {
  it('builds a Google Maps search URL with name and coordinates', () => {
    const url = getGoogleMapsUrl({ lat: 28.6, lon: 77.2, name: 'India Gate' });
    expect(url).toContain('google.com/maps/search');
    expect(url).toContain(encodeURIComponent('India Gate,28.6,77.2'));
  });

  it('builds URL with coordinates only when name is missing', () => {
    const url = getGoogleMapsUrl({ lat: 1, lon: 2 });
    expect(url).toContain(encodeURIComponent('1,2'));
  });
});
