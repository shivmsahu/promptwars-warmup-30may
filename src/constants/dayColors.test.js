import { describe, it, expect } from 'vitest';
import { DAY_COLORS, DAY_HEX_COLORS, TILE_URLS } from './dayColors.js';

describe('dayColors constants', () => {
  it('exports matching hex values for map routes', () => {
    expect(DAY_HEX_COLORS).toHaveLength(DAY_COLORS.length);
    expect(DAY_HEX_COLORS[0]).toBe('#8b5cf6');
  });

  it('exports tile urls for both themes', () => {
    expect(TILE_URLS.dark).toContain('dark_all');
    expect(TILE_URLS.light).toContain('light_all');
  });
});
