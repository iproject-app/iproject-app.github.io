import type { Expense } from './types';

/**
 * Convert an expense's amount to BRL using its fxRate when present. BRL is the
 * project's reporting currency; this is a lossy convenience (fxRate is the
 * one fetched at receipt time, not the live rate) but it's how the existing
 * iproject backend reports totals, so we mirror that behaviour.
 */
export function toBRL(expense: Expense): number {
  const currency = expense.currency ?? 'BRL';
  if (currency === 'BRL') return expense.amount;
  const rate = expense.fxRate ?? 1;
  return expense.amount * rate;
}

/** True if the expense is a bill (open or otherwise). */
export function isBill(expense: Expense): boolean {
  return expense.kind === 'bill';
}

/** Sum of payments that link to a given bill, in BRL. */
export function paidOnBill(billId: string, expenses: Expense[]): number {
  let total = 0;
  for (const e of expenses) {
    if (e.linkedTo === billId && e.kind !== 'bill') {
      total += toBRL(e);
    }
  }
  return total;
}

/** Bill amount in BRL minus payments already linked to it. Zero if overpaid. */
export function remainingOnBill(bill: Expense, expenses: Expense[]): number {
  const remaining = toBRL(bill) - paidOnBill(bill.id, expenses);
  return remaining > 0 ? remaining : 0;
}

/** Bills that still have a positive remaining balance. */
export function openBills(expenses: Expense[]): Expense[] {
  return expenses.filter((e) => isBill(e) && remainingOnBill(e, expenses) > 0);
}

/** Sum of all open bills' remaining balances, in BRL. */
export function totalOutstanding(expenses: Expense[]): number {
  return openBills(expenses).reduce(
    (sum, b) => sum + remainingOnBill(b, expenses),
    0,
  );
}

/** Look up a bill by id; null if it doesn't exist or isn't a bill. */
export function findBillById(
  billId: string | undefined,
  expenses: Expense[],
): Expense | null {
  if (!billId) return null;
  const found = expenses.find((e) => e.id === billId);
  return found && isBill(found) ? found : null;
}
