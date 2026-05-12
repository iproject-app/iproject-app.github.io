import { describe, expect, it } from 'vitest';
import {
  contactSuggestions,
  countNameChanges,
  normalizeContactName,
  normalizeExpenses,
} from './contacts';
import type { Contact, Expense } from './types';

const contact = (over: Partial<Contact> = {}): Contact => ({
  id: 'c1',
  name: 'Francisco Alvaro Lima Vieira',
  aliases: ['Francisco', 'Alvaro', 'Pancho'],
  ...over,
});

const expense = (over: Partial<Expense> = {}): Expense => ({
  id: 'x',
  date: '2026-05-04',
  category: 'Materials',
  payer: 'Joe',
  payee: 'Francisco',
  description: '',
  amount: 100,
  currency: 'BRL',
  kind: 'expense',
  ...over,
});

describe('normalizeContactName', () => {
  it('returns the canonical name when an alias matches case-insensitively', () => {
    expect(normalizeContactName('francisco', [contact()])).toBe(
      'Francisco Alvaro Lima Vieira',
    );
    expect(normalizeContactName('  ALVARO ', [contact()])).toBe(
      'Francisco Alvaro Lima Vieira',
    );
  });

  it('returns the canonical name when the full name matches', () => {
    expect(
      normalizeContactName('francisco alvaro lima vieira', [contact()]),
    ).toBe('Francisco Alvaro Lima Vieira');
  });

  it('returns the trimmed input when nothing matches', () => {
    expect(normalizeContactName('  Sandra  ', [contact()])).toBe('Sandra');
  });

  it('handles null and undefined safely', () => {
    expect(normalizeContactName(null, [contact()])).toBe('');
    expect(normalizeContactName(undefined, [contact()])).toBe('');
  });

  it('skips contacts with no alias list', () => {
    const c: Contact = { id: 'c2', name: 'Sandra' };
    expect(normalizeContactName('Sandra', [c])).toBe('Sandra');
    expect(normalizeContactName('Dona Sandra', [c])).toBe('Dona Sandra');
  });
});

describe('normalizeExpenses', () => {
  it('rewrites matching payer and payee, preserves the rest', () => {
    const list: Expense[] = [
      expense({ payer: 'joe', payee: 'pancho' }),
      expense({ id: 'y', payer: 'francisco', payee: 'sandra' }),
    ];
    const cs: Contact[] = [
      contact(),
      { id: 'c2', name: 'Joe Barnett', aliases: ['Joe', 'JB'] },
    ];
    const next = normalizeExpenses(list, cs);
    expect(next[0].payer).toBe('Joe Barnett');
    expect(next[0].payee).toBe('Francisco Alvaro Lima Vieira');
    expect(next[1].payer).toBe('Francisco Alvaro Lima Vieira');
    expect(next[1].payee).toBe('sandra'); // unchanged — no contact matches
  });

  it('preserves reference identity for rows with no change', () => {
    const e = expense({ payer: 'Joe Barnett', payee: 'Francisco Alvaro Lima Vieira' });
    const cs: Contact[] = [
      contact(),
      { id: 'c2', name: 'Joe Barnett', aliases: ['Joe'] },
    ];
    const next = normalizeExpenses([e], cs);
    expect(next[0]).toBe(e); // same object reference
  });
});

describe('countNameChanges', () => {
  it('counts expenses where payer or payee would be rewritten', () => {
    const list: Expense[] = [
      expense({ payer: 'francisco', payee: 'sandra' }),
      expense({ id: 'y', payer: 'joe barnett', payee: 'francisco' }),
      expense({ id: 'z', payer: 'sandra', payee: 'sandra' }),
    ];
    const cs: Contact[] = [
      contact(),
      { id: 'c2', name: 'Joe Barnett', aliases: ['Joe Barnett'] },
    ];
    // row 1: payer changes (francisco → canonical)
    // row 2: payee changes (francisco → canonical); payer already canonical
    // row 3: no change
    expect(countNameChanges(list, cs)).toBe(2);
  });

  it('returns 0 when everything is already canonical', () => {
    const e = expense({
      payer: 'Joe',
      payee: 'Francisco Alvaro Lima Vieira',
    });
    const cs: Contact[] = [
      contact(),
      { id: 'c2', name: 'Joe', aliases: [] },
    ];
    expect(countNameChanges([e], cs)).toBe(0);
  });
});

describe('contactSuggestions', () => {
  it('returns names + aliases, deduped case-insensitively, sorted', () => {
    const out = contactSuggestions([
      contact(), // Francisco + aliases
      { id: 'c2', name: 'Sandra', aliases: ['Dona Sandra', 'sandra'] }, // dup ignored
    ]);
    expect(out).toContain('Francisco Alvaro Lima Vieira');
    expect(out).toContain('Pancho');
    expect(out).toContain('Sandra');
    expect(out).toContain('Dona Sandra');
    expect(out.filter((s) => s.toLowerCase() === 'sandra')).toHaveLength(1);
    // Alphabetical order.
    expect(out).toEqual([...out].sort((a, b) => a.localeCompare(b)));
  });

  it('returns an empty array when there are no contacts', () => {
    expect(contactSuggestions([])).toEqual([]);
  });
});
