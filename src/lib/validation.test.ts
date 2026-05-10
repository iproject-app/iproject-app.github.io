import { describe, expect, it } from 'vitest';
import {
  newExpenseId,
  validateExpense,
  type ExpenseFormInput,
} from './validation';

const validInput = (overrides: Partial<ExpenseFormInput> = {}): ExpenseFormInput => ({
  date: '2026-05-10',
  category: 'Materials',
  payer: 'Joe',
  payee: 'Hardware Store',
  description: 'Concrete',
  amount: '99.50',
  currency: 'BRL',
  isBill: false,
  ...overrides,
});

describe('validateExpense', () => {
  it('parses a happy-path input into a typed expense', () => {
    const r = validateExpense(validInput());
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.expense).toEqual({
      date: '2026-05-10',
      category: 'Materials',
      payer: 'Joe',
      payee: 'Hardware Store',
      description: 'Concrete',
      amount: 99.5,
      currency: 'BRL',
      kind: 'expense',
    });
  });

  it('rejects non-numeric amount', () => {
    const r = validateExpense(validInput({ amount: 'abc' }));
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/amount/i) });
  });

  it('rejects zero amount', () => {
    const r = validateExpense(validInput({ amount: '0' }));
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/positive/i) });
  });

  it('rejects negative amount', () => {
    const r = validateExpense(validInput({ amount: '-5' }));
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/positive/i) });
  });

  it('rejects empty payee', () => {
    const r = validateExpense(validInput({ payee: '   ' }));
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/payee/i) });
  });

  it('rejects missing date', () => {
    const r = validateExpense(validInput({ date: '' }));
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/date/i) });
  });

  it('trims whitespace from text fields', () => {
    const r = validateExpense(
      validInput({
        category: '  Labor  ',
        payer: '  Joe  ',
        payee: '  Pedro  ',
        description: '  cement  ',
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.expense.category).toBe('Labor');
    expect(r.expense.payer).toBe('Joe');
    expect(r.expense.payee).toBe('Pedro');
    expect(r.expense.description).toBe('cement');
  });

  it('falls back to "Other" when category is blank', () => {
    const r = validateExpense(validInput({ category: '   ' }));
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.expense.category).toBe('Other');
  });

  it('marks bill kind when isBill is true', () => {
    const r = validateExpense(validInput({ isBill: true, payer: '' }));
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('unreachable');
    expect(r.expense.kind).toBe('bill');
    expect(r.expense.payer).toBe('');
  });
});

describe('newExpenseId', () => {
  it('returns unique strings across calls', () => {
    const a = newExpenseId();
    const b = newExpenseId();
    expect(a).not.toBe(b);
    expect(a).toBeTruthy();
  });
});
