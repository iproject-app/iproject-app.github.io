import type { ProjectData } from './types';

export type CheckpointKind = 'upfront' | 'weekly';

export interface CheckpointRow {
  /** Stable key for use in `approvedCheckpoints`. */
  key: string;
  kind: CheckpointKind;
  /** Zero-based week index (0 for the upfront slot). */
  index: number;
  /** ISO YYYY-MM-DD date the payment is due. */
  date: string;
  /** Amount in BRL for this checkpoint. */
  amount: number;
  approved: boolean;
}

const isPositive = (n: number | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

const isNonNegative = (n: number | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0;

/** Add a whole number of days to a YYYY-MM-DD string, preserving local-date
 *  semantics so we don't drift across timezones. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Per-week apportioned payment in BRL: (contract − upfront) ÷ weeks. */
export function weeklyPaymentAmount(data: ProjectData): number {
  if (!isPositive(data.plannedLabor)) return 0;
  if (!isPositive(data.contractWeeks)) return 0;
  const upfront = isNonNegative(data.contractUpfront) ? data.contractUpfront : 0;
  const remaining = Math.max(0, data.plannedLabor - upfront);
  return remaining / data.contractWeeks;
}

/** Ordered list of payment checkpoints. Empty array if the contract is not
 *  configured (missing amount, start date, or weeks). */
export function schedule(data: ProjectData): CheckpointRow[] {
  if (!isPositive(data.plannedLabor)) return [];
  if (!isPositive(data.contractWeeks)) return [];
  if (!data.contractStartDate) return [];

  const upfront = isNonNegative(data.contractUpfront) ? data.contractUpfront : 0;
  const weekly = weeklyPaymentAmount(data);
  const approved = new Set(data.approvedCheckpoints ?? []);
  const rows: CheckpointRow[] = [];

  if (upfront > 0) {
    rows.push({
      key: 'upfront',
      kind: 'upfront',
      index: 0,
      date: data.contractStartDate,
      amount: upfront,
      approved: approved.has('upfront'),
    });
  }
  for (let i = 0; i < data.contractWeeks; i++) {
    const key = `week_${i}`;
    rows.push({
      key,
      kind: 'weekly',
      index: i,
      date: addDays(data.contractStartDate, (i + 1) * 7),
      amount: weekly,
      approved: approved.has(key),
    });
  }
  return rows;
}

/** The earliest unapproved checkpoint, or `null` if everything is approved
 *  (or the contract isn't configured). */
export function nextPayment(data: ProjectData): CheckpointRow | null {
  return schedule(data).find((row) => !row.approved) ?? null;
}

/** Toggle (or set) the approval state for a checkpoint key. Returns a new
 *  array suitable for `approvedCheckpoints`. */
export function toggleApproval(
  current: string[] | undefined,
  key: string,
  next?: boolean,
): string[] {
  const set = new Set(current ?? []);
  const target = next ?? !set.has(key);
  if (target) set.add(key);
  else set.delete(key);
  return [...set];
}
