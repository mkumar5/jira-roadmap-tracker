import { differenceInDays, parseISO, format } from 'date-fns';
import type { SlippageSeverity } from '@/types';

/**
 * Calculate slippage severity based on how many days past due an item is.
 * Negative days = future (not yet due). Positive days = past due.
 *
 * CRITICAL: > 14 days overdue
 * HIGH:     8–14 days overdue
 * MEDIUM:   1–7 days overdue
 * LOW:      due within 3 days (at risk)
 * OK:       due in 4+ days or no due date
 */
export function calculateSlippage(dueDate: string | null, today: Date = new Date()): SlippageSeverity {
  if (!dueDate) return 'OK';
  const days = differenceInDays(today, parseISO(dueDate));
  if (days > 14) return 'CRITICAL';
  if (days > 7) return 'HIGH';
  if (days > 0) return 'MEDIUM';
  if (days >= -3) return 'LOW'; // at risk: due in 0–3 days
  return 'OK';
}

/**
 * Get the number of days past due. Negative means future.
 */
export function getDaysPastDue(dueDate: string | null, today: Date = new Date()): number {
  if (!dueDate) return 0;
  return differenceInDays(today, parseISO(dueDate));
}

/**
 * Format a due date for display with slippage context.
 * Examples:
 *   "5 days overdue (Mar 13, 2026)"
 *   "Due today"
 *   "Due in 3d (Mar 21, 2026)"
 */
export function formatSlipDate(dueDate: string | null, today: Date = new Date()): string {
  if (!dueDate) return '—';
  const days = differenceInDays(today, parseISO(dueDate));
  const formatted = format(parseISO(dueDate), 'MMM d, yyyy');
  if (days > 0) return `${days}d overdue (${formatted})`;
  if (days === 0) return `Due today (${formatted})`;
  return `Due in ${Math.abs(days)}d (${formatted})`;
}

/**
 * Get the CSS class name for a slippage severity level.
 */
export function getSeverityClassName(severity: SlippageSeverity): string {
  const classMap: Record<SlippageSeverity, string> = {
    CRITICAL: 'severity-critical',
    HIGH: 'severity-high',
    MEDIUM: 'severity-medium',
    LOW: 'severity-low',
    OK: 'severity-ok',
  };
  return classMap[severity];
}

/**
 * Get the display label for a slippage severity level.
 */
export function getSeverityLabel(severity: SlippageSeverity): string {
  const labelMap: Record<SlippageSeverity, string> = {
    CRITICAL: 'Critical',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'At Risk',
    OK: 'On Track',
  };
  return labelMap[severity];
}

/**
 * Sort items by slippage severity (most critical first).
 */
export const SEVERITY_ORDER: Record<SlippageSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  OK: 4,
};

export function sortBySeverity<T extends { slippageSeverity: SlippageSeverity }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => SEVERITY_ORDER[a.slippageSeverity] - SEVERITY_ORDER[b.slippageSeverity]
  );
}
