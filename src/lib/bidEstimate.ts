/**
 * Composição de preço — Brazilian masonry bid estimation.
 *
 * Pure, framework-free. Turns a contractor's per-stage quantities, team cost,
 * and daily production into a defensible price (labor by stage + materials
 * with markup + BDI). This is the engine; the page is a thin view over it.
 */

/** m² of surface, a count of units, or linear metres (e.g. footing). */
export type StageUnit = 'm2' | 'un' | 'm';

export interface BidStage {
  /** Stable key — also the i18n suffix `bid.stage.<key>`. */
  key: string;
  unit: StageUnit;
  /** Quantity of `unit` for this job (m² of wall, count of lintels, …). */
  quantity: number;
  /** Cost of the team for one working day, in BRL. */
  dailyTeamCost: number;
  /** Units the team completes in one working day. */
  dailyProduction: number;
  /**
   * Non-labor direct cost per unit, in BRL — materials/rental/disposal
   * tied to this component specifically (e.g. caçamba skip rental per
   * unit). Distinct from the project-wide `materialsCost` lump. Optional;
   * absent → 0. The composição engine prices labor; this is what kept
   * demo/debris understated when it lived only in the lump.
   */
  directCostPerUnit?: number;
}

export interface BidInputs {
  stages: BidStage[];
  /** Materials cost in BRL, before markup. */
  materialsCost: number;
  /** Markup applied to materials, as a percentage (e.g. 18 = +18%). */
  materialsMarkupPct: number;
  /** BDI — admin + travel + profit — as a percentage of the base. */
  bdiPct: number;
  /** Wall area in m², used only to express the final price per m². */
  area: number;
}

export interface StageResult {
  key: string;
  unit: StageUnit;
  /** Labor cost for one unit = dailyTeamCost ÷ dailyProduction. */
  laborPerUnit: number;
  /** Non-labor direct cost for one unit (rental/disposal/materials). */
  directPerUnit: number;
  /** laborPerUnit × quantity. */
  laborSubtotal: number;
  /** directPerUnit × quantity. */
  directSubtotal: number;
  /** laborSubtotal + directSubtotal — the line's full cost. */
  subtotal: number;
}

export interface BidEstimate {
  stages: StageResult[];
  /** Σ laborSubtotal across stages. */
  laborTotal: number;
  /** Σ directSubtotal across stages. */
  directTotal: number;
  materialsWithMarkup: number;
  /** laborTotal + directTotal + materialsWithMarkup, before BDI. */
  base: number;
  bdi: number;
  total: number;
  /** total ÷ area, or 0 when area is not set. */
  pricePerM2: number;
}

/** Clamp to a finite, non-negative number; junk and negatives become 0. */
const clamp = (n: number): number =>
  Number.isFinite(n) && n > 0 ? n : 0;

/** Labor cost per unit for a stage. Zero (not Infinity) when production is 0. */
export function stageLaborPerUnit(stage: BidStage): number {
  const prod = clamp(stage.dailyProduction);
  if (prod === 0) return 0;
  return clamp(stage.dailyTeamCost) / prod;
}

/** Labor-only subtotal: laborPerUnit × quantity. */
export function stageSubtotal(stage: BidStage): number {
  return stageLaborPerUnit(stage) * clamp(stage.quantity);
}

/** Non-labor direct subtotal: directCostPerUnit × quantity. */
export function stageDirectSubtotal(stage: BidStage): number {
  return clamp(stage.directCostPerUnit ?? 0) * clamp(stage.quantity);
}

export function computeEstimate(inputs: BidInputs): BidEstimate {
  const stages: StageResult[] = inputs.stages.map((s) => {
    const laborPerUnit = stageLaborPerUnit(s);
    const directPerUnit = clamp(s.directCostPerUnit ?? 0);
    const qty = clamp(s.quantity);
    const laborSubtotal = laborPerUnit * qty;
    const directSubtotal = directPerUnit * qty;
    return {
      key: s.key,
      unit: s.unit,
      laborPerUnit,
      directPerUnit,
      laborSubtotal,
      directSubtotal,
      subtotal: laborSubtotal + directSubtotal,
    };
  });

  const laborTotal = stages.reduce((sum, s) => sum + s.laborSubtotal, 0);
  const directTotal = stages.reduce((sum, s) => sum + s.directSubtotal, 0);
  const materialsWithMarkup =
    clamp(inputs.materialsCost) * (1 + clamp(inputs.materialsMarkupPct) / 100);
  const base = laborTotal + directTotal + materialsWithMarkup;
  const bdi = base * (clamp(inputs.bdiPct) / 100);
  const total = base + bdi;
  const area = clamp(inputs.area);
  const pricePerM2 = area === 0 ? 0 : total / area;

  return {
    stages,
    laborTotal,
    directTotal,
    materialsWithMarkup,
    base,
    bdi,
    total,
    pricePerM2,
  };
}

/**
 * Reference composição for structural/sealing masonry (blocos 9×19×39).
 * Field-ready defaults from the levantamento; the contractor adjusts per
 * region and team. Quantities seed from a typical small job.
 */
export function defaultStages(): BidStage[] {
  return [
    { key: 'marcacao', unit: 'm2', quantity: 120, dailyTeamCost: 350, dailyProduction: 50 },
    { key: 'alvenaria', unit: 'm2', quantity: 120, dailyTeamCost: 350, dailyProduction: 16 },
    { key: 'vergas', unit: 'un', quantity: 4, dailyTeamCost: 350, dailyProduction: 12 },
    { key: 'chapisco', unit: 'm2', quantity: 120, dailyTeamCost: 460, dailyProduction: 100 },
    { key: 'reboco', unit: 'm2', quantity: 120, dailyTeamCost: 350, dailyProduction: 10 },
  ];
}

export function defaultInputs(): BidInputs {
  return {
    stages: defaultStages(),
    materialsCost: 8000,
    materialsMarkupPct: 18,
    bdiPct: 27,
    area: 120,
  };
}
