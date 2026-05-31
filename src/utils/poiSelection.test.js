import { describe, it, expect } from 'vitest';
import { selectDiversePOIs } from './poiSelection.js';

const makePoi = (id, category) => ({ id, category, name: `POI ${id}` });

describe('poiSelection', () => {
  it('returns empty array for empty input', () => {
    expect(selectDiversePOIs([], 5)).toEqual([]);
    expect(selectDiversePOIs(null, 5)).toEqual([]);
  });

  it('returns all POIs when under limit', () => {
    const pois = [makePoi(1, 'museum'), makePoi(2, 'park')];
    expect(selectDiversePOIs(pois, 5)).toHaveLength(2);
  });

  it('balances categories instead of taking first N', () => {
    const pois = [
      ...Array.from({ length: 10 }, (_, i) => makePoi(i, 'museum')),
      ...Array.from({ length: 10 }, (_, i) => makePoi(i + 10, 'restaurant')),
      ...Array.from({ length: 10 }, (_, i) => makePoi(i + 20, 'park')),
    ];

    const selected = selectDiversePOIs(pois, 9);
    const categories = new Set(selected.map((p) => p.category));

    expect(selected).toHaveLength(9);
    expect(categories.size).toBeGreaterThan(1);
  });

  it('fills remaining slots when category caps are reached', () => {
    const pois = [
      ...Array.from({ length: 8 }, (_, i) => makePoi(`m${i}`, 'museum')),
      ...Array.from({ length: 8 }, (_, i) => makePoi(`r${i}`, 'restaurant')),
    ];

    const selected = selectDiversePOIs(pois, 12);
    expect(selected).toHaveLength(12);
  });
});
