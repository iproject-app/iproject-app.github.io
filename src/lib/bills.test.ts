import { describe, expect, it } from 'vitest';
import {
  findBillById,
  isBill,
  openBills,
  paidOnBill,
  remainingOnBill,
  toBRL,
  totalOutstanding,
} from './bills';
import type { Expense } from './types';

const expense = (over: Partial<Expense> = {}): Expense => ({
  id: 'x',
  date: '2026-05-04',
  category: 'Materials',
  payer: '',
  payee: 'Pedro',
  description: '',
  amount: 100,
  currency: 'BRL',
  kind: 'expense',
  ...over,
});

describe('toBRL', () => {
  it('returns the amount unchanged for BRL', () => {
    expect(toBRL(expense({ amount: 250, currency: 'BRL' }))).toBe(250);
  });

  it('multiplies by fxRate for non-BRL', () => {
    expect(
      toBRL(expense({ amount: 100, currency: 'USD', fxRate: 5.2 })),
    ).toBeCloseTo(520);
  });

  it('falls back to 1.0 when fxRate is missing for non-BRL', () => {
    expect(toBRL(expense({ amount: 100, currency: 'USD' }))).toBe(100);
  });

  it('treats undefined currency as BRL', () => {
    const e = expense({ amount: 50 });
    delete (e as { currency?: string }).currency;
    expect(toBRL(e)).toBe(50);
  });
});

describe('isBill', () => {
  it('true only for kind=bill', () => {
    expect(isBill(expense({ kind: 'bill' }))).toBe(true);
    expect(isBill(expense({ kind: 'expense' }))).toBe(false);
    const e = expense();
    delete (e as { kind?: string }).kind;
    expect(isBill(e)).toBe(false);
  });
});

describe('paidOnBill', () => {
  it('sums payments that link to the bill, in BRL', () => {
    const bill = expense({ id: 'b1', kind: 'bill', amount: 1000 });
    const p1 = expense({ id: 'p1', kind: 'expense', amount: 300, linkedTo: 'b1' });
    const p2 = expense({ id: 'p2', kind: 'expense', amount: 200, linkedTo: 'b1' });
    const other = expense({ id: 'p3', kind: 'expense', amount: 999 });
    expect(paidOnBill('b1', [bill, p1, p2, other])).toBe(500);
  });

  it('ignores entries that are themselves bills', () => {
    const b1 = expense({ id: 'b1', kind: 'bill', amount: 1000 });
    const b2 = expense({ id: 'b2', kind: 'bill', amount: 500, linkedTo: 'b1' });
    expect(paidOnBill('b1', [b1, b2])).toBe(0);
  });

  it('converts non-BRL payments using their fxRate', () => {
    const bill = expense({ id: 'b1', kind: 'bill', amount: 1000 });
    const p = expense({
      id: 'p1',
      kind: 'expense',
      amount: 100,
      currency: 'USD',
      fxRate: 5,
      linkedTo: 'b1',
    });
    expect(paidOnBill('b1', [bill, p])).toBe(500);
  });
});

describe('remainingOnBill', () => {
  it('returns bill total minus paid', () => {
    const bill = expense({ id: 'b1', kind: 'bill', amount: 1000 });
    const p = expense({ id: 'p1', kind: 'expense', amount: 300, linkedTo: 'b1' });
    expect(remainingOnBill(bill, [bill, p])).toBe(700);
  });

  it('clamps overpaid bills to 0', () => {
    const bill = expense({ id: 'b1', kind: 'bill', amount: 100 });
    const p = expense({ id: 'p1', kind: 'expense', amount: 500, linkedTo: 'b1' });
    expect(remainingOnBill(bill, [bill, p])).toBe(0);
  });
});

describe('openBills', () => {
  it('returns only bills with remaining > 0', () => {
    const open = expense({ id: 'b1', kind: 'bill', amount: 100 });
    const settled = expense({ id: 'b2', kind: 'bill', amount: 100 });
    const payment = expense({
      id: 'p1',
      kind: 'expense',
      amount: 100,
      linkedTo: 'b2',
    });
    const list = openBills([open, settled, payment]);
    expect(list.map((b) => b.id)).toEqual(['b1']);
  });

  it('excludes non-bill entries', () => {
    const e = expense({ id: 'x', kind: 'expense', amount: 1 });
    expect(openBills([e])).toEqual([]);
  });
});

describe('totalOutstanding', () => {
  it('sums remaining across all open bills', () => {
    const list: Expense[] = [
      expense({ id: 'b1', kind: 'bill', amount: 1000 }),
      expense({ id: 'b2', kind: 'bill', amount: 500 }),
      expense({ id: 'p1', kind: 'expense', amount: 300, linkedTo: 'b1' }),
      // unrelated payment
      expense({ id: 'p2', kind: 'expense', amount: 999 }),
    ];
    // b1 outstanding 700, b2 outstanding 500 → 1200
    expect(totalOutstanding(list)).toBe(1200);
  });

  it('returns 0 when there are no bills', () => {
    expect(totalOutstanding([expense({ kind: 'expense' })])).toBe(0);
  });
});

describe('findBillById', () => {
  it('returns the matching bill', () => {
    const b = expense({ id: 'b1', kind: 'bill' });
    expect(findBillById('b1', [b])).toBe(b);
  });

  it('returns null when the id does not exist', () => {
    expect(findBillById('missing', [])).toBeNull();
  });

  it('returns null when the matching entry is not a bill', () => {
    const e = expense({ id: 'x', kind: 'expense' });
    expect(findBillById('x', [e])).toBeNull();
  });

  it('returns null when given undefined', () => {
    expect(findBillById(undefined, [])).toBeNull();
  });
});
