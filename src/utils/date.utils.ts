import { differenceInDays, formatDistanceToNow, parseISO, format, isAfter, isBefore } from 'date-fns';

export function sprintDaysRemaining(endDate: string): number {
  if (!endDate) return 0;
  return Math.max(0, differenceInDays(parseISO(endDate), new Date()));
}

export function sprintDaysElapsed(startDate: string): number {
  return Math.max(0, differenceInDays(new Date(), parseISO(startDate)));
}

export function sprintProgress(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const total = differenceInDays(parseISO(endDate), parseISO(startDate));
  if (total <= 0) return 100;
  const elapsed = differenceInDays(new Date(), parseISO(startDate));
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function formatSprintPeriod(startDate: string, endDate: string): string {
  return `${format(parseISO(startDate), 'MMM d')} – ${format(parseISO(endDate), 'MMM d, yyyy')}`;
}

export function isSprintActive(sprint: { startDate: string; endDate: string; state: string }): boolean {
  return sprint.state === 'active';
}

export function isSprintOverdue(endDate: string): boolean {
  return isAfter(new Date(), parseISO(endDate));
}

export function formatRelativeTime(isoTimestamp: string): string {
  return formatDistanceToNow(parseISO(isoTimestamp), { addSuffix: true });
}

export function formatIsoDate(isoDate: string): string {
  return format(parseISO(isoDate), 'MMM d, yyyy');
}

export function isDateInRange(date: string, from: string | null, to: string | null): boolean {
  const parsed = parseISO(date);
  if (from && isBefore(parsed, parseISO(from))) return false;
  if (to && isAfter(parsed, parseISO(to))) return false;
  return true;
}
