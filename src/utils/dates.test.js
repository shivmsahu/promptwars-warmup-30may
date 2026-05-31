import { describe, it, expect } from 'vitest';
import { addDays, formatShortDate, formatDayLabel, formatTripDuration, getTripEndDate, todayISO } from './dates.js';

describe('dates', () => {
  it('addDays shifts calendar date', () => {
    const result = addDays(new Date('2026-05-01'), 3);
    expect(result.getDate()).toBe(4);
  });

  it('formatTripDuration returns nights and days', () => {
    expect(formatTripDuration(1)).toBe('0N1D');
    expect(formatTripDuration(3)).toBe('2N3D');
  });

  it('getTripEndDate returns last day of trip', () => {
    const end = getTripEndDate('2026-05-01', 3);
    expect(end.getDate()).toBe(3);
  });

  it('todayISO returns yyyy-mm-dd', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formatShortDate and formatDayLabel return readable strings', () => {
    const date = new Date('2026-05-01');
    expect(formatShortDate(date)).toContain('2026');
    expect(formatDayLabel(date).length).toBeGreaterThan(3);
  });
});
