import { describe, it, expect } from 'vitest';
import {
  sprintDaysRemaining,
  sprintProgress,
  formatSprintPeriod,
  sprintDaysElapsed,
} from '@/utils/date.utils';
import { format, addDays } from 'date-fns';

const today = new Date();
// Use date-only ISO strings — parseISO treats these as LOCAL midnight (no timezone shift)
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

describe('sprintDaysRemaining', () => {
  it('returns positive for future end date', () => {
    const endDate = fmt(addDays(today, 5));
    // differenceInDays rounds down partial days, so result is 4 or 5 depending on time of day
    const result = sprintDaysRemaining(endDate);
    expect(result).toBeGreaterThanOrEqual(4);
    expect(result).toBeLessThanOrEqual(5);
  });

  it('returns 0 for past end date (clamped)', () => {
    const endDate = fmt(addDays(today, -3));
    expect(sprintDaysRemaining(endDate)).toBe(0);
  });

  it('returns 0 for today', () => {
    const endDate = fmt(today);
    expect(sprintDaysRemaining(endDate)).toBe(0);
  });
});

describe('sprintDaysElapsed', () => {
  it('returns positive for past start date', () => {
    const startDate = fmt(addDays(today, -7));
    expect(sprintDaysElapsed(startDate)).toBe(7);
  });

  it('returns 0 for future start date (clamped)', () => {
    const startDate = fmt(addDays(today, 3));
    expect(sprintDaysElapsed(startDate)).toBe(0);
  });
});

describe('sprintProgress', () => {
  it('returns 50% for sprint halfway through', () => {
    const start = fmt(addDays(today, -7));
    const end = fmt(addDays(today, 7));
    expect(sprintProgress(start, end)).toBe(50);
  });

  it('returns 0% before sprint starts', () => {
    const start = fmt(addDays(today, 5));
    const end = fmt(addDays(today, 19));
    expect(sprintProgress(start, end)).toBe(0);
  });

  it('returns 100% after sprint ends', () => {
    const start = fmt(addDays(today, -14));
    const end = fmt(addDays(today, -1));
    expect(sprintProgress(start, end)).toBe(100);
  });

  it('returns 100% for zero-length sprint', () => {
    const date = fmt(today);
    expect(sprintProgress(date, date)).toBe(100);
  });
});

describe('formatSprintPeriod', () => {
  it('formats correctly', () => {
    // Use date-only strings so parseISO treats them as local midnight (no timezone shift)
    const start = '2026-03-04';
    const end = '2026-03-18';
    const result = formatSprintPeriod(start, end);
    expect(result).toContain('Mar 4');
    expect(result).toContain('Mar 18');
    expect(result).toContain('2026');
  });
});
