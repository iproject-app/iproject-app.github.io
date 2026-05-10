import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, todayISO } from './format';

describe('formatMoney', () => {
  it('formats BRL with pt-BR locale (R$ and comma decimals)', () => {
    expect(formatMoney(1234.56, 'BRL')).toMatch(/R\$\s?1\.234,56/);
  });

  it('defaults to BRL when currency is omitted', () => {
    expect(formatMoney(10)).toBe(formatMoney(10, 'BRL'));
  });

  it('formats USD with en-US locale', () => {
    expect(formatMoney(99.5, 'USD')).toBe('$99.50');
  });

  it('handles zero', () => {
    expect(formatMoney(0, 'USD')).toBe('$0.00');
  });
});

describe('formatDate', () => {
  it('parses YYYY-MM-DD as local without timezone drift', () => {
    // Even in the most extreme western timezone, 2026-05-04 should still
    // render as May 4 — the function parses as a *local* date, not UTC.
    const out = formatDate('2026-05-04');
    expect(out).toMatch(/May\s4/);
  });

  it('returns the input unchanged for malformed strings', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDate('')).toBe('');
  });
});

describe('todayISO', () => {
  it('formats a Date as YYYY-MM-DD with zero-padded month and day', () => {
    const d = new Date(2026, 0, 5); // Jan 5, 2026 local
    expect(todayISO(d)).toBe('2026-01-05');
  });

  it('uses local time, not UTC', () => {
    // 23:59 local on Dec 31 should be 2026-12-31, even if UTC has rolled over.
    const d = new Date(2026, 11, 31, 23, 59);
    expect(todayISO(d)).toBe('2026-12-31');
  });
});
