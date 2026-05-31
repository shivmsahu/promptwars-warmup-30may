import { describe, it, expect } from 'vitest';
import { getCategoryEmoji, getCategoryLabel } from './categoryEmoji.js';

describe('categoryEmoji', () => {
  it('returns emoji for known categories', () => {
    expect(getCategoryEmoji('museum')).toBe('🏛️');
    expect(getCategoryEmoji('restaurant')).toBe('🍽️');
  });

  it('falls back for unknown categories', () => {
    expect(getCategoryEmoji('unknown')).toBe('📍');
    expect(getCategoryEmoji()).toBe('📍');
  });

  it('capitalizes category labels', () => {
    expect(getCategoryLabel('museum')).toBe('Museum');
    expect(getCategoryLabel()).toBe('Poi');
  });
});
