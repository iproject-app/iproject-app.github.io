import { describe, expect, it } from 'vitest';
import {
  STANDARD_CATEGORIES,
  categoryClass,
  categorySuggestions,
} from './categories';

describe('categoryClass', () => {
  it('returns palette classes for known categories case-insensitively', () => {
    expect(categoryClass('Labor')).toContain('blue');
    expect(categoryClass('labor')).toContain('blue');
    expect(categoryClass('LABOR')).toContain('blue');
    expect(categoryClass('Materials')).toContain('emerald');
  });

  it('falls back to slate for unknown categories', () => {
    expect(categoryClass('Aviation')).toContain('slate');
    expect(categoryClass('')).toContain('slate');
  });
});

describe('categorySuggestions', () => {
  it('includes all standard categories when no custom list is given', () => {
    const out = categorySuggestions();
    for (const c of STANDARD_CATEGORIES) {
      expect(out).toContain(c);
    }
  });

  it('puts custom categories first', () => {
    const out = categorySuggestions(['Sand', 'Roofing']);
    expect(out[0]).toBe('Sand');
    expect(out[1]).toBe('Roofing');
  });

  it('dedupes case-insensitively, preserving first occurrence casing', () => {
    const out = categorySuggestions(['materials']);
    // 'materials' appears once, with its original casing — Materials from the
    // standard list is dropped as a duplicate.
    expect(out.filter((c) => c.toLowerCase() === 'materials')).toEqual(['materials']);
  });
});
