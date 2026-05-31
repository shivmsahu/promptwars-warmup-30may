import { describe, it, expect } from 'vitest';
import {
  poiKey,
  buildGlobalIndexMap,
  buildPoiPopup,
  buildMarkerHtml,
  toLatLngPath,
  MARKER_BOX,
} from './mapUtils.js';

describe('mapUtils', () => {
  const poi = { id: 1, name: 'Louvre', category: 'museum', lat: 48.8, lon: 2.3, openingHours: '09:00-18:00', website: 'https://louvre.fr' };

  it('builds stable poi keys', () => {
    expect(poiKey(2, 99)).toBe('2-99');
  });

  it('builds global index map', () => {
    const map = buildGlobalIndexMap([
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }],
    ]);
    expect(map['0-1']).toBe(1);
    expect(map['1-3']).toBe(3);
  });

  it('builds popup html with links and metadata', () => {
    const html = buildPoiPopup(poi, 1, 0, '#8b5cf6', false);
    expect(html).toContain('Louvre');
    expect(html).toContain('https://louvre.fr');
    expect(html).toContain('google.com/maps');
  });

  it('builds selected marker html with larger size', () => {
    const html = buildMarkerHtml(3, '#06b6d4', true);
    expect(html).toContain('36px');
    expect(html).toContain('marker-dot-selected');
  });

  it('converts lon/lat path to lat/lng', () => {
    expect(toLatLngPath([[2.3, 48.8], [2.4, 48.9]])).toEqual([[48.8, 2.3], [48.9, 2.4]]);
  });

  it('exports marker dimensions', () => {
    expect(MARKER_BOX).toBe(44);
  });
});
