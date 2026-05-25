import { describe, expect, it } from 'vitest';
import {
  FormulaError,
  compileFormula,
  evaluateFormula,
  formulaIdentifiers,
  safeEvaluate,
} from './formula';

describe('arithmetic', () => {
  it('respects precedence and parentheses', () => {
    expect(evaluateFormula('1 + 2 * 3', {})).toBe(7);
    expect(evaluateFormula('(1 + 2) * 3', {})).toBe(9);
    expect(evaluateFormula('2 * 3 - 4 / 2', {})).toBe(4);
    expect(evaluateFormula('-3 + 5', {})).toBe(2);
    expect(evaluateFormula('2.5 * 4', {})).toBe(10);
  });

  it('resolves identifiers from scope', () => {
    expect(
      evaluateFormula('length * height - openingsArea', {
        length: 40,
        height: 3,
        openingsArea: 6,
      }),
    ).toBe(114);
  });

  it('treats booleans as 1/0 and supports ternary', () => {
    const f = 'retaining ? length * factor : length';
    expect(evaluateFormula(f, { retaining: true, length: 40, factor: 1.5 })).toBe(60);
    expect(evaluateFormula(f, { retaining: false, length: 40, factor: 1.5 })).toBe(40);
  });

  it('supports comparisons and logical ops with short-circuit', () => {
    expect(evaluateFormula('height >= 3 && retaining', { height: 3, retaining: true })).toBe(1);
    expect(evaluateFormula('height > 5 || count == 0', { height: 3, count: 0 })).toBe(1);
    expect(evaluateFormula('!retaining', { retaining: false })).toBe(1);
  });

  it('supports the builtin allowlist', () => {
    expect(evaluateFormula('max(a, b, 10)', { a: 3, b: 7 })).toBe(10);
    expect(evaluateFormula('min(a, b)', { a: 3, b: 7 })).toBe(3);
    expect(evaluateFormula('ceil(a / b)', { a: 10, b: 3 })).toBe(4);
    expect(evaluateFormula('floor(a / b)', { a: 10, b: 3 })).toBe(3);
    expect(evaluateFormula('round(a / b)', { a: 10, b: 4 })).toBe(3);
    expect(evaluateFormula('abs(0 - 5)', {})).toBe(5);
  });
});

describe('safeEvaluate clamps non-finite to 0', () => {
  it('division by zero → 0', () => {
    expect(safeEvaluate('a / b', { a: 10, b: 0 })).toBe(0);
  });
  it('NaN → 0', () => {
    expect(safeEvaluate('a * b', { a: Number.NaN, b: 2 })).toBe(0);
  });
  it('finite values pass through', () => {
    expect(safeEvaluate('a + b', { a: 2, b: 3 })).toBe(5);
  });
});

describe('formulaIdentifiers', () => {
  it('reports free variables and called builtins', () => {
    const c = compileFormula('max(length * height, foundationMin) - openingsArea');
    const { vars, funcs } = formulaIdentifiers(c);
    expect(vars.sort()).toEqual(['foundationMin', 'height', 'length', 'openingsArea']);
    expect(funcs).toEqual(['max']);
  });
});

describe('security boundary', () => {
  it('rejects an unknown identifier rather than guessing', () => {
    expect(() => evaluateFormula('length * unknownThing', { length: 1 })).toThrow(
      FormulaError,
    );
  });

  it('rejects an unknown / non-allowlisted function', () => {
    expect(() => evaluateFormula('alert(1)', {})).toThrow(FormulaError);
    expect(() => evaluateFormula('eval(1)', {})).toThrow(FormulaError);
  });

  it('does not reach JS globals or host objects', () => {
    for (const src of [
      'constructor',
      'globalThis',
      'Math',
      'process',
      'window',
      'this',
    ]) {
      // bare identifier → unknown identifier (not bound in scope)
      expect(() => evaluateFormula(src, {})).toThrow(FormulaError);
    }
  });

  it('has no member access, indexing, or string literals', () => {
    for (const src of [
      'a.b',
      'a["b"]',
      'a[0]',
      '"string"',
      "'x'",
      'a` + b',
      'a; b',
      'a = 1',
    ]) {
      expect(() => evaluateFormula(src, { a: 1, b: 2 })).toThrow(FormulaError);
    }
  });

  it('cannot reach Object prototype via a crafted name', () => {
    // __proto__ is a valid identifier lexically but is not an own
    // property of the scope, so it is rejected.
    expect(() => evaluateFormula('__proto__', {})).toThrow(FormulaError);
    expect(() => evaluateFormula('hasOwnProperty', {})).toThrow(FormulaError);
  });

  it('rejects oversized input', () => {
    const huge = '1' + '+1'.repeat(400);
    expect(() => compileFormula(huge)).toThrow(/too long/);
  });

  it('rejects pathologically nested input instead of blowing the stack', () => {
    const deep = '('.repeat(200) + '1' + ')'.repeat(200);
    expect(() => compileFormula(deep)).toThrow(/too deeply nested/);
  });

  it('rejects malformed expressions', () => {
    for (const src of ['1 +', '* 2', '(1 + 2', '1 2', 'max(1,', '? 1 : 2']) {
      expect(() => compileFormula(src)).toThrow(FormulaError);
    }
  });
});

describe('field takeoff formulas', () => {
  const scope = {
    length: 40,
    height: 3,
    openingsArea: 6,
    openingsCount: 2,
    retaining: true,
    reinforcementFactor: 1.5,
    demolitionAreaM2: 120,
    debrisCacambas: 3,
  };

  it('net wall face, never negative', () => {
    expect(
      safeEvaluate('max(0, length * height - openingsArea)', scope),
    ).toBe(114);
    expect(
      safeEvaluate('max(0, length * height - openingsArea)', {
        ...scope,
        openingsArea: 9999,
      }),
    ).toBe(0);
  });

  it('footing metres scale by reinforcement when retaining', () => {
    const f = 'retaining ? length * reinforcementFactor : length';
    expect(safeEvaluate(f, scope)).toBe(60);
    expect(safeEvaluate(f, { ...scope, retaining: false })).toBe(40);
  });

  it('demolition and debris come straight from guided params', () => {
    expect(safeEvaluate('demolitionAreaM2', scope)).toBe(120);
    expect(safeEvaluate('debrisCacambas', scope)).toBe(3);
  });
});
