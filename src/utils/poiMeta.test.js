import { describe, it, expect } from 'vitest';
import { buildPoiMetaMap, computeTotalTravelMinutes } from './poiMeta.js';

describe('poiMeta', () => {
  it('builds global stop indices across days', () => {
    const meta = buildPoiMetaMap([
      [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
      [{ id: 'c', name: 'C' }],
    ]);

    expect(meta['0-a'].globalIndex).toBe(1);
    expect(meta['0-b'].globalIndex).toBe(2);
    expect(meta['1-c'].globalIndex).toBe(3);
  });

  it('computes total travel minutes from matrix', () => {
    const pois = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const matrix = [
      [0, 600, 1200],
      [600, 0, 600],
      [1200, 600, 0],
    ];
    const itineraries = [[pois[0], pois[1]], [pois[2]]];

    expect(computeTotalTravelMinutes(itineraries, pois, matrix)).toBe(10);
  });
});
