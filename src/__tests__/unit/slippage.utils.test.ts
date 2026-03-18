import { describe, it, expect } from 'vitest';
import { parseISO, addDays, format } from 'date-fns';
import {
  calculateSlippage,
  getDaysPastDue,
  formatSlipDate,
  sortBySeverity,
} from '@/utils/slippage.utils';

// Use parseISO so today and all date() offsets are LOCAL midnight —
// consistent with how parseISO works inside slippage.utils.ts.
const today = parseISO('2026-03-18');

const date = (daysOffset: number): string =>
  format(addDays(today, daysOffset), 'yyyy-MM-dd');

describe('calculateSlippage', () => {
  it('returns OK when due date is null', () => {
    expect(calculateSlippage(null, today)).toBe('OK');
  });

  it('returns OK when due in 4+ days', () => {
    expect(calculateSlippage(date(4), today)).toBe('OK');
    expect(calculateSlippage(date(30), today)).toBe('OK');
  });

  it('returns LOW (at risk) when due in 0-3 days', () => {
    expect(calculateSlippage(date(0), today)).toBe('LOW');
    expect(calculateSlippage(date(1), today)).toBe('LOW');
    expect(calculateSlippage(date(3), today)).toBe('LOW');
  });

  it('returns MEDIUM when 1-7 days overdue', () => {
    expect(calculateSlippage(date(-1), today)).toBe('MEDIUM');
    expect(calculateSlippage(date(-7), today)).toBe('MEDIUM');
  });

  it('returns HIGH when 8-14 days overdue', () => {
    expect(calculateSlippage(date(-8), today)).toBe('HIGH');
    expect(calculateSlippage(date(-14), today)).toBe('HIGH');
  });

  it('returns CRITICAL when more than 14 days overdue', () => {
    expect(calculateSlippage(date(-15), today)).toBe('CRITICAL');
    expect(calculateSlippage(date(-30), today)).toBe('CRITICAL');
    expect(calculateSlippage(date(-365), today)).toBe('CRITICAL');
  });
});

describe('getDaysPastDue', () => {
  it('returns 0 for null due date', () => {
    expect(getDaysPastDue(null, today)).toBe(0);
  });

  it('returns positive number when overdue', () => {
    expect(getDaysPastDue(date(-5), today)).toBe(5);
  });

  it('returns negative number when future', () => {
    expect(getDaysPastDue(date(10), today)).toBe(-10);
  });

  it('returns 0 when due today', () => {
    expect(getDaysPastDue(date(0), today)).toBe(0);
  });
});

describe('formatSlipDate', () => {
  it('returns — for null', () => {
    expect(formatSlipDate(null)).toBe('—');
  });

  it('shows overdue message when past due', () => {
    const result = formatSlipDate(date(-5), today);
    expect(result).toContain('5d overdue');
  });

  it('shows due today message', () => {
    const result = formatSlipDate(date(0), today);
    expect(result).toContain('Due today');
  });

  it('shows days remaining when future', () => {
    const result = formatSlipDate(date(3), today);
    expect(result).toContain('Due in 3d');
  });
});

describe('sortBySeverity', () => {
  it('sorts CRITICAL first', () => {
    const items = [
      { slippageSeverity: 'OK' as const, id: '3' },
      { slippageSeverity: 'CRITICAL' as const, id: '1' },
      { slippageSeverity: 'HIGH' as const, id: '2' },
    ];
    const sorted = sortBySeverity(items);
    expect(sorted[0]?.slippageSeverity).toBe('CRITICAL');
    expect(sorted[1]?.slippageSeverity).toBe('HIGH');
    expect(sorted[2]?.slippageSeverity).toBe('OK');
  });
});
