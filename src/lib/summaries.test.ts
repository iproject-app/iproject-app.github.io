import { describe, expect, it } from 'vitest';
import {
  byCategory,
  byPayer,
  paidOnCategory,
  totalSpent,
} from './summaries';
import type { Expense } from './types';

const expense = (over: Partial<Expense> = {}): Expense => ({
  id: 'x',
  date: '2026-05-04',
  category: 'Materials',
  payer: 'Joe',
  payee: 'Pedro',
  description: '',
  amount: 100,
  currency: 'BRL',
  kind: 'expense',
  ...over,
});

describe('totalSpent', () => {
  it('sums non-bill spend in BRL', () => {
    const list: Expense[] = [
      expense({ amount: 100 }),
      expense({ amount: 50 }),
    ];
    expect(totalSpent(list)).toBe(150);
  });

  it('excludes bills (orçamentos)', () => {
    const list: Expense[] = [
      expense({ id: 'b', kind: 'bill', amount: 9999 }),
      expense({ amount: 100 }),
    ];
    expect(totalSpent(list)).toBe(100);
  });

  it('converts non-BRL via fxRate', () => {
    const list: Expense[] = [
      expense({ amount: 100, currency: 'USD', fxRate: 5.2 }),
      expense({ amount: 50 }),
    ];
    expect(totalSpent(list)).toBeCloseTo(570);
  });

  it('returns 0 for an empty list', () => {
    expect(totalSpent([])).toBe(0);
  });
});

describe('byCategory', () => {
  it('groups non-bill spend by category, sorted desc', () => {
    const list: Expense[] = [
      expense({ category: 'Materials', amount: 100 }),
      expense({ category: 'Labor', amount: 300 }),
      expense({ category: 'Materials', amount: 200 }),
    ];
    // Tie on total → alphabetical by category for stable display.
    expect(byCategory(list)).toEqual([
      { category: 'Labor', total: 300 },
      { category: 'Materials', total: 300 },
    ]);
  });

  it('treats empty category as "Other"', () => {
    const list: Expense[] = [
      expense({ category: '', amount: 50 }),
      expense({ category: '   ', amount: 50 }),
    ];
    expect(byCategory(list)).toEqual([{ category: 'Other', total: 100 }]);
  });

  it('omits categories that net to zero or below', () => {
    const list: Expense[] = [
      expense({ category: 'Refund', amount: 0 }),
      expense({ category: 'Materials', amount: 100 }),
    ];
    expect(byCategory(list).map((r) => r.category)).toEqual(['Materials']);
  });

  it('excludes bills', () => {
    const list: Expense[] = [
      expense({ kind: 'bill', category: 'Materials', amount: 1000 }),
      expense({ category: 'Materials', amount: 100 }),
    ];
    expect(byCategory(list)).toEqual([{ category: 'Materials', total: 100 }]);
  });
});

describe('paidOnCategory', () => {
  it('sums non-bill spend in the given category (case-insensitive)', () => {
    const list: Expense[] = [
      expense({ category: 'Labor', amount: 100 }),
      expense({ category: 'labor', amount: 50 }),
      expense({ category: 'Materials', amount: 999 }),
    ];
    expect(paidOnCategory(list, 'Labor')).toBe(150);
    expect(paidOnCategory(list, 'labor')).toBe(150);
  });

  it('excludes bills', () => {
    const list: Expense[] = [
      expense({ kind: 'bill', category: 'Labor', amount: 1000 }),
      expense({ category: 'Labor', amount: 100 }),
    ];
    expect(paidOnCategory(list, 'Labor')).toBe(100);
  });

  it('converts non-BRL via fxRate', () => {
    const list: Expense[] = [
      expense({ category: 'Materials', amount: 100, currency: 'USD', fxRate: 5 }),
    ];
    expect(paidOnCategory(list, 'Materials')).toBe(500);
  });

  it('returns 0 for a category with no matching expenses', () => {
    expect(paidOnCategory([expense()], 'Aviation')).toBe(0);
  });
});

describe('byPayer', () => {
  it('groups non-bill spend by payer, sorted desc', () => {
    const list: Expense[] = [
      expense({ payer: 'Joe', amount: 100 }),
      expense({ payer: 'Sandra', amount: 250 }),
      expense({ payer: 'Joe', amount: 50 }),
    ];
    expect(byPayer(list)).toEqual([
      { payer: 'Sandra', total: 250 },
      { payer: 'Joe', total: 150 },
    ]);
  });

  it('keeps empty payer as a blank-key bucket', () => {
    const list: Expense[] = [
      expense({ payer: '', amount: 100 }),
      expense({ payer: 'Joe', amount: 50 }),
    ];
    const result = byPayer(list);
    expect(result.find((r) => r.payer === '')).toEqual({
      payer: '',
      total: 100,
    });
  });

  it('excludes bills', () => {
    const list: Expense[] = [
      expense({ kind: 'bill', payer: 'Quarry', amount: 1000 }),
      expense({ payer: 'Joe', amount: 100 }),
    ];
    expect(byPayer(list).map((r) => r.payer)).toEqual(['Joe']);
  });
});
