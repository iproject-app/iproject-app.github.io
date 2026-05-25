/**
 * Data-driven bid type definitions.
 *
 * A bid is for ONE job type (external security wall, later a slab, a
 * roof). A type is a serializable DEFINITION — params + components +
 * quantity formulas + default composição rates — not a code module.
 * One generic engine (here) and one generic UI consume any definition;
 * adding a job type is adding a definition, zero engine changes.
 *
 * Params are number / boolean / enum / list. A `list` param is a
 * repeatable group of numeric sub-fields (e.g. openings: width, height,
 * area) with an optional per-row derive formula. Lists never appear in
 * formulas directly — the binding reduces each list to scalar scope
 * vars (`<key>Count`, `<key>_<field>Sum`) so the formula language stays
 * unchanged and safe.
 *
 * See docs/design/bid-type-definitions.md.
 */

import type { BidStage, StageUnit } from './bidEstimate';
import {
  BUILTIN_NAMES,
  compileFormula,
  formulaIdentifiers,
  safeEvaluate,
  type CompiledFormula,
} from './formula';

export type ParamKind = 'number' | 'boolean' | 'enum' | 'list';

/** A numeric column of a `list` param. */
export interface ListFieldSpec {
  key: string;
  labelKey: string;
  min?: number;
  step?: number;
}

export interface ParamSpec {
  key: string;
  kind: ParamKind;
  /** i18n key for the field label. */
  labelKey: string;
  /** Optional i18n key for an info-icon tooltip explaining the field. */
  helpKey?: string;
  /** number/boolean/enum default; list params default to no rows. */
  default?: number | boolean | string;
  /** enum only — allowed values; each gets i18n key `<labelKey>.<value>`. */
  options?: string[];
  /** number UI hints. */
  min?: number;
  step?: number;
  /** Optional visibility guard — a formula over number/boolean params
   *  and list-derived names. Falsy → the param is hidden (and treated
   *  as its default in formulas). Lets a checkbox reveal its details. */
  showWhen?: string;
  /** list only — the repeatable numeric columns. */
  fields?: ListFieldSpec[];
  /** list only — `fieldKey → formula` over the row's field keys. Lets a
   *  column auto-fill from others (area = area>0 ? area : width*height)
   *  while staying user-overridable. Uses the safe evaluator. */
  rowDerive?: Record<string, string>;
}

/** Default-rate override driven by an enum param's selected value. */
export interface RateByEnum {
  paramKey: string;
  map: Record<string, Partial<StageRate>>;
}

export interface StageRate {
  dailyTeamCost: number;
  dailyProduction: number;
}

/**
 * One material this component consumes. `consumption` is the amount of
 * material per ONE component-unit (per m² of wall, per m of footing, …),
 * a formula over params. Material quantity = consumption × component
 * quantity. `unit` is a display token (un, m³, m², kg, saco). Unit price
 * defaults to 0 — the contractor enters his depósito price (later: a
 * selected supplier quote). Coefficients are reference defaults to
 * calibrate, never fabricated prices.
 */
export interface MaterialLineSpec {
  materialKey: string;
  unit: string;
  consumption: string;
  defaultUnitPrice?: number;
  /** Optional: swap the consumption formula by an enum param's value
   *  (e.g. blocks/m² differs by block type). Same pattern as
   *  `rateByEnum`; falls back to `consumption` for unmapped values. */
  consumptionByEnum?: { paramKey: string; map: Record<string, string> };
  /** Optional: reference unit price by an enum value (e.g. clay vs
   *  concrete block). A contractor-entered price still wins; unmapped
   *  values fall back to `defaultUnitPrice`. */
  defaultUnitPriceByEnum?: { paramKey: string; map: Record<string, number> };
}

/** A material's compiled consumption: a base formula plus optional
 *  per-enum overrides. */
export interface CompiledMaterial {
  base: CompiledFormula;
  byEnum?: { paramKey: string; map: Record<string, CompiledFormula> };
}

export interface ComponentSpec {
  key: string;
  unit: StageUnit;
  labelKey: string;
  /** Skippable in a bid (vs. core to the job). */
  optional: boolean;
  /** On when a fresh bid is created. */
  defaultIncluded: boolean;
  /** Takeoff math over param keys — a formula string. */
  quantity: string;
  defaultRate: StageRate;
  /** Optional: pick the default rate from an enum param's value. */
  rateByEnum?: RateByEnum;
  /** Reference non-labor direct cost per unit (rental/disposal/material
   *  specific to this component), BRL. Contractor-adjustable like the
   *  rate; absent → 0. */
  defaultDirectCostPerUnit?: number;
  /** Bill of materials this component consumes (priced separately from
   *  labor; sums into the materials total). */
  materials?: MaterialLineSpec[];
}

export interface BidTypeDef {
  id: string;
  labelKey: string;
  params: ParamSpec[];
  components: ComponentSpec[];
  /** Reference area for price-per-m² — a formula over numeric params.
   *  Optional; absent → no per-m² figure. */
  areaFormula?: string;
  defaults: {
    materialsCost: number;
    materialsMarkupPct: number;
    bdiPct: number;
  };
}

export type ListRow = Record<string, number>;
export type ParamValue = number | boolean | string | ListRow[];
export type ParamValues = Record<string, ParamValue>;

/** A validated definition: every quantity/area/derive formula is
 *  compiled and its identifiers are known to be declared params /
 *  list-derived names / allowlisted builtins. */
export interface CompiledBidType {
  readonly def: BidTypeDef;
  readonly compiled: Record<string, CompiledFormula>;
  readonly compiledArea?: CompiledFormula;
  /** paramKey → (fieldKey → compiled derive formula). */
  readonly compiledRowDerive: Record<string, Record<string, CompiledFormula>>;
  /** paramKey → compiled visibility guard (params with `showWhen`). */
  readonly compiledShowWhen: Record<string, CompiledFormula>;
  /** componentKey → compiled consumption per material line (aligned
   *  with the component's `materials` array order). */
  readonly compiledMaterials: Record<string, CompiledMaterial[]>;
}

export class BidTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BidTypeError';
  }
}

const dup = (xs: string[]): string | undefined => {
  const seen = new Set<string>();
  for (const x of xs) {
    if (seen.has(x)) return x;
    seen.add(x);
  }
  return undefined;
};

/** Scalar scope identifiers a `list` param contributes to formulas. */
export function listDerivedNames(p: ParamSpec): string[] {
  const names = [`${p.key}Count`];
  for (const f of p.fields ?? []) names.push(`${p.key}_${f.key}Sum`);
  return names;
}

function checkIdentifiers(
  where: string,
  cf: CompiledFormula,
  allowedVars: Set<string>,
): void {
  const { vars, funcs } = formulaIdentifiers(cf);
  for (const v of vars) {
    if (!allowedVars.has(v)) {
      throw new BidTypeError(`${where} references unknown/enum param "${v}"`);
    }
  }
  for (const fn of funcs) {
    if (!BUILTIN_NAMES.includes(fn)) {
      throw new BidTypeError(`${where} calls unknown function "${fn}"`);
    }
  }
}

/**
 * Validate a definition up front. A type cannot be used until it passes:
 * unique keys, enum/list sanity, every formula parses, and every formula
 * references only declared NUMERIC/BOOLEAN params, list-derived names
 * (enums and raw lists never appear in formulas), and allowlisted
 * builtins.
 */
export function validateBidType(def: BidTypeDef): CompiledBidType {
  const pdup = dup(def.params.map((p) => p.key));
  if (pdup) throw new BidTypeError(`duplicate param "${pdup}"`);
  const cdup = dup(def.components.map((c) => c.key));
  if (cdup) throw new BidTypeError(`duplicate component "${cdup}"`);

  const paramByKey = new Map(def.params.map((p) => [p.key, p]));
  const compiledRowDerive: Record<string, Record<string, CompiledFormula>> = {};

  for (const p of def.params) {
    if (p.kind === 'enum') {
      if (!p.options || p.options.length === 0) {
        throw new BidTypeError(`enum param "${p.key}" has no options`);
      }
      if (!p.options.includes(String(p.default))) {
        throw new BidTypeError(`enum param "${p.key}" default not in options`);
      }
    }
    if (p.kind === 'list') {
      if (!p.fields || p.fields.length === 0) {
        throw new BidTypeError(`list param "${p.key}" has no fields`);
      }
      const fdup = dup(p.fields.map((f) => f.key));
      if (fdup) {
        throw new BidTypeError(`list param "${p.key}" duplicate field "${fdup}"`);
      }
      const fieldKeys = new Set(p.fields.map((f) => f.key));
      const derived: Record<string, CompiledFormula> = {};
      for (const [fk, src] of Object.entries(p.rowDerive ?? {})) {
        if (!fieldKeys.has(fk)) {
          throw new BidTypeError(
            `list param "${p.key}" rowDerive targets unknown field "${fk}"`,
          );
        }
        let cf: CompiledFormula;
        try {
          cf = compileFormula(src);
        } catch (e) {
          throw new BidTypeError(
            `list "${p.key}" derive "${fk}": ${(e as Error).message}`,
          );
        }
        checkIdentifiers(`list "${p.key}" derive "${fk}"`, cf, fieldKeys);
        derived[fk] = cf;
      }
      compiledRowDerive[p.key] = derived;
    }
  }

  // Identifiers a quantity/area formula may reference: number/boolean
  // params, plus the scalar names each list param contributes.
  const formulaParams = new Set<string>();
  for (const p of def.params) {
    if (p.kind === 'number' || p.kind === 'boolean') formulaParams.add(p.key);
    if (p.kind === 'list') {
      for (const n of listDerivedNames(p)) formulaParams.add(n);
    }
  }

  const compiled: Record<string, CompiledFormula> = {};
  for (const c of def.components) {
    let cf: CompiledFormula;
    try {
      cf = compileFormula(c.quantity);
    } catch (e) {
      throw new BidTypeError(
        `component "${c.key}" quantity: ${(e as Error).message}`,
      );
    }
    checkIdentifiers(`component "${c.key}"`, cf, formulaParams);
    if (c.rateByEnum) {
      const ep = paramByKey.get(c.rateByEnum.paramKey);
      if (!ep || ep.kind !== 'enum') {
        throw new BidTypeError(
          `component "${c.key}" rateByEnum param "${c.rateByEnum.paramKey}" is not an enum`,
        );
      }
    }
    compiled[c.key] = cf;
  }

  const compiledMaterials: Record<string, CompiledMaterial[]> = {};
  for (const c of def.components) {
    if (!c.materials?.length) continue;
    compiledMaterials[c.key] = c.materials.map((m) => {
      const where = `component "${c.key}" material "${m.materialKey}"`;
      const compile = (src: string, what: string): CompiledFormula => {
        let f: CompiledFormula;
        try {
          f = compileFormula(src);
        } catch (e) {
          throw new BidTypeError(`${where} ${what}: ${(e as Error).message}`);
        }
        checkIdentifiers(where, f, formulaParams);
        return f;
      };
      const result: CompiledMaterial = {
        base: compile(m.consumption, 'consumption'),
      };
      if (m.consumptionByEnum) {
        const ep = paramByKey.get(m.consumptionByEnum.paramKey);
        if (!ep || ep.kind !== 'enum') {
          throw new BidTypeError(
            `${where} consumptionByEnum param "${m.consumptionByEnum.paramKey}" is not an enum`,
          );
        }
        const map: Record<string, CompiledFormula> = {};
        for (const [val, src] of Object.entries(m.consumptionByEnum.map)) {
          map[val] = compile(src, `consumption[${val}]`);
        }
        result.byEnum = { paramKey: m.consumptionByEnum.paramKey, map };
      }
      if (m.defaultUnitPriceByEnum) {
        const ep = paramByKey.get(m.defaultUnitPriceByEnum.paramKey);
        if (!ep || ep.kind !== 'enum') {
          throw new BidTypeError(
            `${where} defaultUnitPriceByEnum param "${m.defaultUnitPriceByEnum.paramKey}" is not an enum`,
          );
        }
      }
      return result;
    });
  }

  let compiledArea: CompiledFormula | undefined;
  if (def.areaFormula !== undefined) {
    try {
      compiledArea = compileFormula(def.areaFormula);
    } catch (e) {
      throw new BidTypeError(`areaFormula: ${(e as Error).message}`);
    }
    checkIdentifiers('areaFormula', compiledArea, formulaParams);
  }

  const compiledShowWhen: Record<string, CompiledFormula> = {};
  for (const p of def.params) {
    if (p.showWhen === undefined) continue;
    let cf: CompiledFormula;
    try {
      cf = compileFormula(p.showWhen);
    } catch (e) {
      throw new BidTypeError(
        `param "${p.key}" showWhen: ${(e as Error).message}`,
      );
    }
    checkIdentifiers(`param "${p.key}" showWhen`, cf, formulaParams);
    compiledShowWhen[p.key] = cf;
  }

  return {
    def,
    compiled,
    compiledArea,
    compiledRowDerive,
    compiledShowWhen,
    compiledMaterials,
  };
}

/** Initial param values: declared defaults; list params start empty. */
export function defaultParamValues(def: BidTypeDef): ParamValues {
  return Object.fromEntries(
    def.params.map((p) => [
      p.key,
      p.kind === 'list' ? ([] as ListRow[]) : (p.default as ParamValue),
    ]),
  );
}

/** Component keys that are included when a fresh bid is created. */
export function defaultIncluded(def: BidTypeDef): Record<string, boolean> {
  return Object.fromEntries(
    def.components.map((c) => [c.key, c.defaultIncluded]),
  );
}

/** A list row with its derive formulas applied (area auto-fills, etc.).
 *  Derive formulas decide precedence (e.g. `area>0 ? area : w*h`). */
export function deriveRow(
  ct: CompiledBidType,
  paramKey: string,
  row: ListRow,
): ListRow {
  const derive = ct.compiledRowDerive[paramKey] ?? {};
  const scope: Record<string, number> = {};
  for (const [k, v] of Object.entries(row)) scope[k] = Number(v) || 0;
  const out: ListRow = { ...scope };
  for (const [fk, cf] of Object.entries(derive)) {
    out[fk] = safeEvaluate(cf, scope);
  }
  return out;
}

function resolveRate(c: ComponentSpec, values: ParamValues): StageRate {
  if (!c.rateByEnum) return c.defaultRate;
  const sel = String(values[c.rateByEnum.paramKey]);
  return { ...c.defaultRate, ...(c.rateByEnum.map[sel] ?? {}) };
}

/** Raw scope, ignoring visibility: number/boolean params, plus each
 *  list reduced to its scalar vars (`<key>Count`, `<key>_<field>Sum`).
 *  Enums and raw lists never reach formulas — enforced by validation. */
function rawScope(
  ct: CompiledBidType,
  values: ParamValues,
): Record<string, number | boolean> {
  const scope: Record<string, number | boolean> = {};
  for (const p of ct.def.params) {
    if (p.kind === 'enum') continue;
    if (p.kind === 'list') {
      const rows = Array.isArray(values[p.key])
        ? (values[p.key] as ListRow[])
        : [];
      scope[`${p.key}Count`] = rows.length;
      for (const f of p.fields ?? []) {
        scope[`${p.key}_${f.key}Sum`] = rows.reduce(
          (sum, r) => sum + (deriveRow(ct, p.key, r)[f.key] || 0),
          0,
        );
      }
      continue;
    }
    const v = values[p.key];
    scope[p.key] = typeof v === 'boolean' ? v : Number(v);
  }
  return scope;
}

/** Is a param shown? `showWhen` evaluated against the raw values; params
 *  without a guard are always visible. */
export function isParamVisible(
  ct: CompiledBidType,
  paramKey: string,
  values: ParamValues,
): boolean {
  const cf = ct.compiledShowWhen[paramKey];
  if (!cf) return true;
  return safeEvaluate(cf, rawScope(ct, values)) !== 0;
}

/**
 * Formula scope. A hidden param (its `showWhen` is falsy) contributes
 * its default instead of whatever stale value it holds, so toggling a
 * guard off cleanly removes its effect from every formula.
 */
function numericScope(
  ct: CompiledBidType,
  values: ParamValues,
): Record<string, number | boolean> {
  const base = rawScope(ct, values);
  for (const p of ct.def.params) {
    if (!ct.compiledShowWhen[p.key]) continue;
    if (isParamVisible(ct, p.key, values)) continue;
    if (p.kind === 'list') {
      base[`${p.key}Count`] = 0;
      for (const f of p.fields ?? []) base[`${p.key}_${f.key}Sum`] = 0;
    } else if (p.kind !== 'enum') {
      const d = p.default;
      base[p.key] = typeof d === 'boolean' ? d : Number(d) || 0;
    }
  }
  return base;
}

/** Reference area for price-per-m². 0 when the type declares none. */
export function estimateArea(
  ct: CompiledBidType,
  values: ParamValues,
): number {
  if (!ct.compiledArea) return 0;
  return safeEvaluate(ct.compiledArea, numericScope(ct, values));
}

/**
 * Run the takeoff: for every INCLUDED component, evaluate its quantity
 * formula against the scope and resolve its rate + direct cost. The
 * result feeds the unchanged composição engine (computeEstimate).
 */
export function buildStages(
  ct: CompiledBidType,
  values: ParamValues,
  included: Record<string, boolean>,
): BidStage[] {
  const scope = numericScope(ct, values);

  return ct.def.components
    .filter((c) => included[c.key])
    .map((c) => {
      const rate = resolveRate(c, values);
      return {
        key: c.key,
        unit: c.unit,
        quantity: safeEvaluate(ct.compiled[c.key], scope),
        dailyTeamCost: rate.dailyTeamCost,
        dailyProduction: rate.dailyProduction,
        directCostPerUnit: c.defaultDirectCostPerUnit ?? 0,
      };
    });
}

export interface MaterialResult {
  componentKey: string;
  materialKey: string;
  unit: string;
  /** Material per ONE component-unit — the (overridable) coefficient. */
  consumptionPerUnit: number;
  /** consumptionPerUnit × component quantity. */
  materialQty: number;
  unitPrice: number;
  /** materialQty × unitPrice. */
  lineCost: number;
}

/** `componentKey:materialKey` → a contractor-entered override. */
export type MaterialPrices = Record<string, number>;
export type MaterialConsumptions = Record<string, number>;

export function materialPriceKey(
  componentKey: string,
  materialKey: string,
): string {
  return `${componentKey}:${materialKey}`;
}

/**
 * Bill of materials for every INCLUDED component: each material's
 * quantity = consumption(params) × the component's takeoff quantity,
 * priced at the contractor's unit price (override) or the reference
 * default. Returns the itemized lines and their total — the total
 * replaces the old single "materials cost" lump fed to computeEstimate.
 */
export function buildMaterials(
  ct: CompiledBidType,
  values: ParamValues,
  included: Record<string, boolean>,
  prices: MaterialPrices = {},
  consumptionOverrides: MaterialConsumptions = {},
): { lines: MaterialResult[]; total: number } {
  const scope = numericScope(ct, values);
  const lines: MaterialResult[] = [];

  for (const c of ct.def.components) {
    if (!included[c.key] || !c.materials?.length) continue;
    const compQty = safeEvaluate(ct.compiled[c.key], scope);
    const consumptions = ct.compiledMaterials[c.key] ?? [];
    c.materials.forEach((m, i) => {
      const cm = consumptions[i];
      let formula = cm.base;
      if (cm.byEnum) {
        const sel = String(values[cm.byEnum.paramKey]);
        formula = cm.byEnum.map[sel] ?? cm.base;
      }
      const k = materialPriceKey(c.key, m.materialKey);
      const defaultPerUnit = safeEvaluate(formula, scope);
      const ovr = consumptionOverrides[k];
      const perUnit =
        ovr !== undefined && Number.isFinite(ovr) && ovr >= 0
          ? ovr
          : defaultPerUnit;
      const materialQty = perUnit * compQty;
      let reference = m.defaultUnitPrice ?? 0;
      if (m.defaultUnitPriceByEnum) {
        const sel = String(values[m.defaultUnitPriceByEnum.paramKey]);
        reference = m.defaultUnitPriceByEnum.map[sel] ?? reference;
      }
      const raw = prices[k] ?? reference;
      const unitPrice = Number.isFinite(raw) && raw > 0 ? raw : 0;
      lines.push({
        componentKey: c.key,
        materialKey: m.materialKey,
        unit: m.unit,
        consumptionPerUnit: perUnit,
        materialQty,
        unitPrice,
        lineCost: materialQty * unitPrice,
      });
    });
  }

  return {
    lines,
    total: lines.reduce((sum, l) => sum + l.lineCost, 0),
  };
}
