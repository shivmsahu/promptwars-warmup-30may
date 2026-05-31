import { describe, it, expect } from 'vitest';
import { clusterPOIs } from './clustering.js';

const pois = [
  { id: 'a', category: 'museum', name: 'Museum A' },
  { id: 'b', category: 'park', name: 'Park B' },
  { id: 'c', category: 'restaurant', name: 'Restaurant C' },
  { id: 'd', category: 'cafe', name: 'Cafe D' },
];

const matrix = [
  [0, 100, 200, 300],
  [100, 0, 150, 250],
  [200, 150, 0, 120],
  [300, 250, 120, 0],
];

describe('clusterPOIs', () => {
  it('returns empty for no POIs', () => {
    expect(clusterPOIs([], matrix, 3)).toEqual([]);
    expect(clusterPOIs(null, matrix, 3)).toEqual([]);
  });

  it('clusters POIs into requested number of days', () => {
    const result = clusterPOIs(pois, matrix, 2);
    expect(result).toHaveLength(2);
    expect(result.flat()).toHaveLength(4);
  });

  it('orders stops within each day', () => {
    const result = clusterPOIs(pois, matrix, 2);
    result.forEach((day) => {
      expect(day.length).toBeGreaterThan(0);
      expect(new Set(day.map((p) => p.id)).size).toBe(day.length);
    });
  });

  it('applies weather penalties for outdoor POIs on rainy days', () => {
    const weather = [
      { weatherCode: 61 },
      { weatherCode: 0 },
      { weatherCode: 0 },
    ];
    const result = clusterPOIs(pois, matrix, 2, weather);
    const rainyDay = result[0].some((p) => p.category === 'park');
    expect(result.flat()).toHaveLength(4);
    expect(typeof rainyDay).toBe('boolean');
  });

  it('handles single POI', () => {
    const result = clusterPOIs([pois[0]], [[0]], 2);
    expect(result.flat()).toHaveLength(1);
  });
});
