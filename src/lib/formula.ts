/**
 * Safe arithmetic formula evaluator for bid-type quantity takeoffs.
 *
 * A bid type's component quantities are serializable strings — e.g.
 * `length * height - openingsArea`, `retaining ? length * factor : length`.
 * Definitions are data and may be authored outside code review, so a
 * formula is UNTRUSTED input that gets evaluated. This module is the
 * security boundary for that.
 *
 * Hard rules (see docs/design/bid-type-definitions.md):
 *  - No eval, no Function, no template evaluation. Hand-written
 *    tokenizer + recursive-descent parser only.
 *  - No member access, no indexing, no string literals. Identifiers
 *    resolve solely from the supplied scope; unknown identifier or
 *    function is a hard error, not a runtime surprise.
 *  - Fixed builtin allowlist. No globalThis / Math / host objects.
 *  - Input length and AST depth caps bound parse/eval cost.
 *
 * Booleans are numbers (0/1). Comparisons and logical ops yield 1/0.
 * The language is intentionally numeric and string-free; enums affect
 * rates, not quantities.
 */

const MAX_SOURCE_LENGTH = 500;
const MAX_DEPTH = 64;

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

/** Fixed builtin allowlist. Variadic; operate on plain numbers only. */
const BUILTINS: Record<string, (args: number[]) => number> = {
  max: (a) => (a.length ? Math.max(...a) : 0),
  min: (a) => (a.length ? Math.min(...a) : 0),
  abs: (a) => Math.abs(a[0] ?? 0),
  ceil: (a) => Math.ceil(a[0] ?? 0),
  floor: (a) => Math.floor(a[0] ?? 0),
  round: (a) => Math.round(a[0] ?? 0),
};

export const BUILTIN_NAMES: readonly string[] = Object.keys(BUILTINS);

// ---- AST ------------------------------------------------------------

type Expr =
  | { k: 'num'; v: number }
  | { k: 'var'; name: string }
  | { k: 'call'; name: string; args: Expr[] }
  | { k: 'unary'; op: '-' | '!'; e: Expr }
  | { k: 'bin'; op: BinOp; l: Expr; r: Expr }
  | { k: 'cond'; c: Expr; t: Expr; f: Expr };

type BinOp =
  | '+' | '-' | '*' | '/'
  | '<' | '<=' | '>' | '>='
  | '==' | '!='
  | '&&' | '||';

export interface CompiledFormula {
  readonly source: string;
  readonly ast: Expr;
}

// ---- Tokenizer ------------------------------------------------------

type Tok =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'eof' };

const TWO_CHAR = new Set(['<=', '>=', '==', '!=', '&&', '||']);
const ONE_CHAR = new Set(['+', '-', '*', '/', '(', ')', ',', '?', ':', '<', '>', '!']);

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i;
      while (j < n && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) j++;
      const raw = src.slice(i, j);
      const v = Number(raw);
      if (!Number.isFinite(v)) {
        throw new FormulaError(`invalid number "${raw}"`);
      }
      toks.push({ t: 'num', v });
      i = j;
      continue;
    }
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
      let j = i;
      while (
        j < n &&
        ((src[j] >= 'a' && src[j] <= 'z') ||
          (src[j] >= 'A' && src[j] <= 'Z') ||
          (src[j] >= '0' && src[j] <= '9') ||
          src[j] === '_')
      ) {
        j++;
      }
      toks.push({ t: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (TWO_CHAR.has(two)) {
      toks.push({ t: 'op', v: two });
      i += 2;
      continue;
    }
    if (ONE_CHAR.has(c)) {
      toks.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new FormulaError(`unexpected character "${c}"`);
  }
  toks.push({ t: 'eof' });
  return toks;
}

// ---- Parser (recursive descent, precedence-climbing) ----------------

class Parser {
  private pos = 0;
  private depth = 0;
  private readonly toks: Tok[];

  constructor(toks: Tok[]) {
    this.toks = toks;
  }

  parse(): Expr {
    const e = this.expr();
    if (this.peek().t !== 'eof') {
      throw new FormulaError('unexpected trailing input');
    }
    return e;
  }

  private peek(): Tok {
    return this.toks[this.pos];
  }

  private eat(op: string): void {
    const tk = this.peek();
    if (tk.t !== 'op' || tk.v !== op) {
      throw new FormulaError(`expected "${op}"`);
    }
    this.pos++;
  }

  private isOp(v: string): boolean {
    const tk = this.peek();
    return tk.t === 'op' && tk.v === v;
  }

  private enter(): void {
    if (++this.depth > MAX_DEPTH) {
      throw new FormulaError('formula too deeply nested');
    }
  }

  private leave(): void {
    this.depth--;
  }

  private expr(): Expr {
    return this.ternary();
  }

  private ternary(): Expr {
    const c = this.or();
    if (this.isOp('?')) {
      this.enter();
      this.eat('?');
      const t = this.expr();
      this.eat(':');
      const f = this.expr();
      this.leave();
      return { k: 'cond', c, t, f };
    }
    return c;
  }

  private binLevel(next: () => Expr, ops: string[]): Expr {
    let left = next();
    while (this.peek().t === 'op' && ops.includes((this.peek() as { v: string }).v)) {
      const op = (this.peek() as { v: string }).v as BinOp;
      this.enter();
      this.pos++;
      const right = next();
      this.leave();
      left = { k: 'bin', op, l: left, r: right };
    }
    return left;
  }

  private or(): Expr {
    return this.binLevel(() => this.and(), ['||']);
  }
  private and(): Expr {
    return this.binLevel(() => this.equality(), ['&&']);
  }
  private equality(): Expr {
    return this.binLevel(() => this.comparison(), ['==', '!=']);
  }
  private comparison(): Expr {
    return this.binLevel(() => this.additive(), ['<', '<=', '>', '>=']);
  }
  private additive(): Expr {
    return this.binLevel(() => this.multiplicative(), ['+', '-']);
  }
  private multiplicative(): Expr {
    return this.binLevel(() => this.unary(), ['*', '/']);
  }

  private unary(): Expr {
    if (this.isOp('-') || this.isOp('!')) {
      const op = (this.peek() as { v: string }).v as '-' | '!';
      this.enter();
      this.pos++;
      const e = this.unary();
      this.leave();
      return { k: 'unary', op, e };
    }
    return this.primary();
  }

  private primary(): Expr {
    const tk = this.peek();
    if (tk.t === 'num') {
      this.pos++;
      return { k: 'num', v: tk.v };
    }
    if (tk.t === 'id') {
      this.pos++;
      if (this.isOp('(')) {
        this.enter();
        this.eat('(');
        const args: Expr[] = [];
        if (!this.isOp(')')) {
          args.push(this.expr());
          while (this.isOp(',')) {
            this.eat(',');
            args.push(this.expr());
          }
        }
        this.eat(')');
        this.leave();
        return { k: 'call', name: tk.v, args };
      }
      return { k: 'var', name: tk.v };
    }
    if (tk.t === 'op' && tk.v === '(') {
      this.enter();
      this.eat('(');
      const e = this.expr();
      this.eat(')');
      this.leave();
      return e;
    }
    throw new FormulaError('unexpected token');
  }
}

// ---- Compile / evaluate --------------------------------------------

export function compileFormula(source: string): CompiledFormula {
  if (typeof source !== 'string') {
    throw new FormulaError('formula must be a string');
  }
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new FormulaError('formula too long');
  }
  const ast = new Parser(tokenize(source)).parse();
  return { source, ast };
}

/** Identifiers a formula references: free variables and called builtins. */
export function formulaIdentifiers(c: CompiledFormula): {
  vars: string[];
  funcs: string[];
} {
  const vars = new Set<string>();
  const funcs = new Set<string>();
  const walk = (e: Expr): void => {
    switch (e.k) {
      case 'num':
        return;
      case 'var':
        vars.add(e.name);
        return;
      case 'call':
        funcs.add(e.name);
        e.args.forEach(walk);
        return;
      case 'unary':
        walk(e.e);
        return;
      case 'bin':
        walk(e.l);
        walk(e.r);
        return;
      case 'cond':
        walk(e.c);
        walk(e.t);
        walk(e.f);
        return;
    }
  };
  walk(c.ast);
  return { vars: [...vars], funcs: [...funcs] };
}

type Scope = Record<string, number | boolean>;

const truthy = (v: number): boolean => Number.isFinite(v) && v !== 0;

function evalNode(e: Expr, scope: Scope): number {
  switch (e.k) {
    case 'num':
      return e.v;
    case 'var': {
      if (!Object.prototype.hasOwnProperty.call(scope, e.name)) {
        throw new FormulaError(`unknown identifier "${e.name}"`);
      }
      const raw = scope[e.name];
      if (typeof raw === 'boolean') return raw ? 1 : 0;
      return typeof raw === 'number' ? raw : Number.NaN;
    }
    case 'call': {
      const fn = Object.prototype.hasOwnProperty.call(BUILTINS, e.name)
        ? BUILTINS[e.name]
        : undefined;
      if (!fn) throw new FormulaError(`unknown function "${e.name}"`);
      return fn(e.args.map((a) => evalNode(a, scope)));
    }
    case 'unary': {
      const v = evalNode(e.e, scope);
      return e.op === '-' ? -v : truthy(v) ? 0 : 1;
    }
    case 'cond':
      return truthy(evalNode(e.c, scope))
        ? evalNode(e.t, scope)
        : evalNode(e.f, scope);
    case 'bin': {
      // Short-circuit logical ops.
      if (e.op === '&&') {
        return truthy(evalNode(e.l, scope)) && truthy(evalNode(e.r, scope))
          ? 1
          : 0;
      }
      if (e.op === '||') {
        return truthy(evalNode(e.l, scope)) || truthy(evalNode(e.r, scope))
          ? 1
          : 0;
      }
      const l = evalNode(e.l, scope);
      const r = evalNode(e.r, scope);
      switch (e.op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/':
          return l / r;
        case '<':
          return l < r ? 1 : 0;
        case '<=':
          return l <= r ? 1 : 0;
        case '>':
          return l > r ? 1 : 0;
        case '>=':
          return l >= r ? 1 : 0;
        case '==':
          return l === r ? 1 : 0;
        case '!=':
          return l !== r ? 1 : 0;
      }
    }
  }
}

/** Evaluate, returning the raw number (may be non-finite). */
export function evaluateFormula(
  formula: string | CompiledFormula,
  scope: Scope,
): number {
  const c = typeof formula === 'string' ? compileFormula(formula) : formula;
  return evalNode(c.ast, scope);
}

/**
 * Evaluate for takeoff use: non-finite results (div-by-zero, overflow,
 * NaN) clamp to 0, consistent with the composição clamping.
 */
export function safeEvaluate(
  formula: string | CompiledFormula,
  scope: Scope,
): number {
  const v = evaluateFormula(formula, scope);
  return Number.isFinite(v) ? v : 0;
}
