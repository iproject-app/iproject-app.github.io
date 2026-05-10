import type { Expense } from './types';

export interface ExpenseFormInput {
  date: string;
  category: string;
  payer: string;
  payee: string;
  description: string;
  /** Raw value from the amount input — we parse + validate here. */
  amount: string;
  currency: string;
  isBill: boolean;
}

export type ExpenseValidation =
  | { ok: true; expense: Omit<Expense, 'id'> }
  | { ok: false; error: string };

export function validateExpense(input: ExpenseFormInput): ExpenseValidation {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Amount must be a positive number.' };
  }
  if (!input.payee.trim()) {
    return { ok: false, error: 'Payee is required.' };
  }
  if (!input.date) {
    return { ok: false, error: 'Date is required.' };
  }
  return {
    ok: true,
    expense: {
      date: input.date,
      category: input.category.trim() || 'Other',
      payer: input.payer.trim(),
      payee: input.payee.trim(),
      description: input.description.trim(),
      amount,
      currency: input.currency,
      kind: input.isBill ? 'bill' : 'expense',
    },
  };
}

/**
 * Generate a stable ID for a new expense. Prefers crypto.randomUUID when
 * available; otherwise falls back to a timestamped pseudo-random ID.
 * Side-effecting and time-dependent, kept out of validateExpense for testing.
 */
export function newExpenseId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `expense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
