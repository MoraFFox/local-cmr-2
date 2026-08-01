import { describe, it, expect } from 'vitest';
import {
  calculateRentalDuration,
  calculateDailyRentalPrice,
  calculateBillableDays,
  normalizeMachineName,
  findDuplicateNameGroups,
} from '../../hooks/useLogisticsOperations';

describe('calculateRentalDuration', () => {
  it('returns correct days for a 9-day span (June 11 → June 20)', () => {
    const result = calculateRentalDuration('2026-06-11', '2026-06-20');
    expect(result.days).toBe(9);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
  });

  it('returns correct days/hours for a partial day span', () => {
    // 36 hours = 1 day + 12 hours
    const start = '2026-06-11T00:00:00';
    const end = '2026-06-12T12:00:00';
    const result = calculateRentalDuration(start, end);
    expect(result.days).toBe(1);
    expect(result.hours).toBe(12);
  });

  it('returns zero when close date equals open date', () => {
    const result = calculateRentalDuration('2026-06-11', '2026-06-11');
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
  });

  it('returns zero when close date is before open date (historical edge case)', () => {
    const result = calculateRentalDuration('2026-06-20', '2026-06-11');
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
  });

  it('handles cross-month durations correctly', () => {
    // March 1 → April 1 = 31 days
    const result = calculateRentalDuration('2026-03-01', '2026-04-01');
    expect(result.days).toBe(31);
  });

  it('handles same-day with hours and minutes', () => {
    // 2 hours 30 minutes
    const result = calculateRentalDuration('2026-06-11T08:00', '2026-06-11T10:30');
    expect(result.days).toBe(0);
    expect(result.hours).toBe(2);
    expect(result.minutes).toBe(30);
  });
});

describe('calculateDailyRentalPrice', () => {
  it('divides monthly price by 30 (rounds to 2 decimals)', () => {
    expect(calculateDailyRentalPrice(3000)).toBe(100);
    expect(calculateDailyRentalPrice(1500)).toBe(50);
  });

  it('rounds to 2 decimal places', () => {
    // 1000 / 30 = 33.333... → 33.33
    expect(calculateDailyRentalPrice(1000)).toBe(33.33);
  });

  it('handles zero monthly price', () => {
    expect(calculateDailyRentalPrice(0)).toBe(0);
  });
});

describe('calculateBillableDays', () => {
  it('returns the day count directly (simple policy)', () => {
    expect(calculateBillableDays({ days: 9 })).toBe(9);
    expect(calculateBillableDays({ days: 1 })).toBe(1);
  });

  it('clamps negative days to 0', () => {
    expect(calculateBillableDays({ days: -5 })).toBe(0);
  });

  it('returns 0 for zero days', () => {
    expect(calculateBillableDays({ days: 0 })).toBe(0);
  });
});

describe('normalizeMachineName', () => {
  it('trims, collapses internal whitespace, and lowercases', () => {
    expect(normalizeMachineName('  La  Marzocco   Linea ')).toBe('la marzocco linea');
  });

  it('handles already-clean names', () => {
    expect(normalizeMachineName('Mazzer Super Jolly')).toBe('mazzer super jolly');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeMachineName('   ')).toBe('');
  });
});

describe('findDuplicateNameGroups', () => {
  const entry = (id: number, name: string) => ({ id, name });

  it('groups case-insensitive duplicates', () => {
    const groups = findDuplicateNameGroups([
      entry(1, 'La Marzocco'),
      entry(2, 'la marzocco'),
      entry(3, 'Mazzer'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((n) => n.id)).toEqual([1, 2]);
  });

  it('groups whitespace variants of the same brand', () => {
    const groups = findDuplicateNameGroups([
      entry(1, 'Mazzer  Super'),
      entry(2, ' mazzer super '),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((n) => n.id)).toEqual([1, 2]);
  });

  it('returns no groups when all names are unique', () => {
    const groups = findDuplicateNameGroups([
      entry(1, 'La Marzocco'),
      entry(2, 'Mazzer'),
      entry(3, 'Nuova Simonelli'),
    ]);
    expect(groups).toHaveLength(0);
  });

  it('ignores empty/whitespace-only names', () => {
    const groups = findDuplicateNameGroups([entry(1, '   '), entry(2, 'La Marzocco')]);
    expect(groups).toHaveLength(0);
  });

  it('handles an empty list', () => {
    expect(findDuplicateNameGroups([])).toHaveLength(0);
  });
});
