import { describe, it, expect, vi } from 'vitest';
import {
  SHARE_QUERY_KEYS,
  buildShareParams,
  buildShareUrl,
  parseShareParams,
  readShareParamsFromLocation,
  writeShareParamsToLocation,
  getInitialTripStateFromUrl,
  clampDaysCount,
  clampRadiusKm,
  clampStartDate,
} from './tripShare.js';

describe('tripShare', () => {
  const today = '2026-05-31';

  it('builds compact query params for a trip', () => {
    const params = buildShareParams({
      destination: 'Paris',
      startDate: '2026-06-01',
      daysCount: 3,
      radiusKm: 8,
      autoRun: true,
    });

    expect(params.get(SHARE_QUERY_KEYS.destination)).toBe('Paris');
    expect(params.get(SHARE_QUERY_KEYS.startDate)).toBe('2026-06-01');
    expect(params.get(SHARE_QUERY_KEYS.daysCount)).toBe('3');
    expect(params.get(SHARE_QUERY_KEYS.radiusKm)).toBe('8');
    expect(params.get(SHARE_QUERY_KEYS.autoRun)).toBe('1');
  });

  it('builds a full share URL with auto-run enabled', () => {
    const url = buildShareUrl(
      { destination: 'New Delhi', startDate: '2026-06-01', daysCount: 4, radiusKm: 10, autoRun: true },
      'https://example.com/planner'
    );

    expect(url).toBe('https://example.com/planner?to=New+Delhi&start=2026-06-01&days=4&radius=10&run=1');
  });

  it('parses and validates shared trip params', () => {
    const parsed = parseShareParams('?to=Paris&start=2026-06-01&days=3&radius=5&run=1', today);

    expect(parsed).toEqual({
      destination: 'Paris',
      startDate: '2026-06-01',
      daysCount: 3,
      radiusKm: 5,
      autoRun: true,
      hasSharedTrip: true,
    });
  });

  it('clamps invalid numeric and date values', () => {
    expect(clampDaysCount('9')).toBe(5);
    expect(clampDaysCount('0')).toBe(1);
    expect(clampRadiusKm('99')).toBe(99);
    expect(clampRadiusKm('150')).toBe(100);
    expect(clampStartDate('2026-01-01', today)).toBe(today);
    expect(clampStartDate('not-a-date', today)).toBeUndefined();
  });

  it('reads share params from a location object', () => {
    const parsed = readShareParamsFromLocation(
      { search: '?to=Tokyo&days=2&radius=6&run=1', pathname: '/', hash: '' },
      today
    );

    expect(parsed.destination).toBe('Tokyo');
    expect(parsed.daysCount).toBe(2);
    expect(parsed.autoRun).toBe(true);
  });

  it('writes share params to history without auto-run', () => {
    const replaceState = vi.fn();
    const nextUrl = writeShareParamsToLocation(
      { destination: 'London', startDate: '2026-06-05', daysCount: 2, radiusKm: 4 },
      { pathname: '/app', hash: '', search: '' },
      { replaceState }
    );

    expect(nextUrl).toBe('/app?to=London&start=2026-06-05&days=2&radius=4');
    expect(replaceState).toHaveBeenCalledWith(null, '', nextUrl);
  });

  it('returns defaults when URL has no trip params', () => {
    const initial = getInitialTripStateFromUrl({ search: '', pathname: '/', hash: '' }, today);

    expect(initial).toEqual({
      destination: '',
      startDate: today,
      daysCount: 3,
      radiusKm: 5,
      autoRun: false,
      hasSharedTrip: false,
    });
  });
});
