import type { Expense } from './types';
import { isBill, toBRL } from './bills';

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface PayerTotal {
  payer: string;
  total: number;
}

/**
 * Sum of non-bill spend in BRL. Bills are excluded — they represent money
 * owed, not money out — and only their linked payments count.
 */
export function totalSpent(expenses: Expense[]): number {
  let total = 0;
  for (const e of expenses) {
    if (isBill(e)) continue;
    total += toBRL(e);
  }
  return total;
}

/**
 * Per-category totals across non-bill spend. Categories with zero or
 * negative balance are dropped. Returned sorted by total descending so the
 * UI doesn't need to re-sort.
 */
export function byCategory(expenses: Expense[]): CategoryTotal[] {
  const acc = new Map<string, number>();
  for (const e of expenses) {
    if (isBill(e)) continue;
    const key = (e.category || 'Other').trim() || 'Other';
    acc.set(key, (acc.get(key) ?? 0) + toBRL(e));
  }
  return Array.from(acc, ([category, total]) => ({ category, total }))
    .filter((row) => row.total > 0)
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.category.localeCompare(b.category);
    });
}

/**
 * Sum of non-bill spend in BRL for a single category (case-insensitive match).
 * Useful for "Paid on Labor"-style headline tiles where we want the figure
 * irrespective of how the category was capitalised on individual entries.
 */
export function paidOnCategory(
  expenses: Expense[],
  category: string,
): number {
  const target = category.trim().toLowerCase();
  let total = 0;
  for (const e of expenses) {
    if (isBill(e)) continue;
    if ((e.category || '').trim().toLowerCase() === target) {
      total += toBRL(e);
    }
  }
  return total;
}

/**
 * Per-payer totals across non-bill spend. Empty payers are bucketed under
 * an empty string; callers can format that as "—" or "Unknown".
 */
export function byPayer(expenses: Expense[]): PayerTotal[] {
  const acc = new Map<string, number>();
  for (const e of expenses) {
    if (isBill(e)) continue;
    const key = (e.payer || '').trim();
    acc.set(key, (acc.get(key) ?? 0) + toBRL(e));
  }
  return Array.from(acc, ([payer, total]) => ({ payer, total }))
    .filter((row) => row.total > 0)
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.payer.localeCompare(b.payer);
    });
}
