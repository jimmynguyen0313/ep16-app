import { describe, expect, it } from '@jest/globals';

import { addDays, addMonths, friendlyDate, isValidISO, monthGrid, todayISO } from './dates';

describe('dates', () => {
  it('formats today in local time', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
  it('adds days across months, years and leap days', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('adds months across years', () => {
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });
  it('lays out a month Sunday first', () => {
    // November 2026 starts on a Sunday and has 30 days.
    const weeks = monthGrid(2026, 11);
    expect(weeks[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(weeks.at(-1)).toEqual([29, 30, null, null, null, null, null]);
    // January 2026 starts on a Thursday.
    expect(monthGrid(2026, 1)[0]).toEqual([null, null, null, null, 1, 2, 3]);
  });
  it('validates dates', () => {
    expect(isValidISO('2026-02-29')).toBe(false);
    expect(isValidISO('2028-02-29')).toBe(true);
    expect(isValidISO('2026-13-01')).toBe(false);
  });
  it('names today and yesterday', () => {
    expect(friendlyDate('2026-11-24', '2026-11-24')).toBe('Today');
    expect(friendlyDate('2026-11-23', '2026-11-24')).toBe('Yesterday');
    expect(friendlyDate('2026-11-02', '2026-11-24')).toBe('Nov 2, 2026');
  });
});
