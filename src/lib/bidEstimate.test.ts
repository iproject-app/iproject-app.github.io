import { describe, expect, it } from 'vitest';
import {
  computeEstimate,
  defaultInputs,
  defaultStages,
  stageLaborPerUnit,
  stageSubtotal,
  type BidStage,
} from './bidEstimate';

const stage = (over: Partial<BidStage> = {}): BidStage => ({
  key: 'x',
  unit: 'm2',
  quantity: 100,
  dailyTeamCost: 350,
  dailyProduction: 16,
  ...over,
});

describe('stageLaborPerUnit', () => {
  it('is dailyTeamCost ÷ dailyProduction', () => {
    expect(stageLaborPerUnit(stage({ dailyTeamCost: 350, dailyProduction: 16 }))).toBeCloseTo(21.875, 6);
    expect(stageLaborPerUnit(stage({ dailyTeamCost: 350, dailyProduction: 50 }))).toBe(7);
    expect(stageLaborPerUnit(stage({ dailyTeamCost: 460, dailyProduction: 100 }))).toBeCloseTo(4.6, 6);
  });

  it('is 0 (not Infinity) when production is 0', () => {
    expect(stageLaborPerUnit(stage({ dailyProduction: 0 }))).toBe(0);
  });

  it('treats negative / non-finite inputs as 0', () => {
    expect(stageLaborPerUnit(stage({ dailyTeamCost: -350 }))).toBe(0);
    expect(stageLaborPerUnit(stage({ dailyProduction: Number.NaN }))).toBe(0);
  });
});

describe('stageSubtotal', () => {
  it('is laborPerUnit × quantity', () => {
    expect(stageSubtotal(stage({ quantity: 120, dailyTeamCost: 350, dailyProduction: 10 }))).toBe(4200);
  });

  it('clamps negative quantity to 0', () => {
    expect(stageSubtotal(stage({ quantity: -5 }))).toBe(0);
  });
});

describe('computeEstimate', () => {
  it('sums labor, applies materials markup and BDI, and divides by area', () => {
    const e = computeEstimate(defaultInputs());

    // 7·120 + 21.875·120 + 29.1666·4 + 4.6·120 + 35·120
    expect(e.laborTotal).toBeCloseTo(8333.6667, 3);
    expect(e.materialsWithMarkup).toBeCloseTo(9440, 6); // 8000 × 1.18
    expect(e.base).toBeCloseTo(17773.6667, 3);
    expect(e.bdi).toBeCloseTo(4798.89, 2); // base × 0.27
    expect(e.total).toBeCloseTo(22572.5567, 3);
    expect(e.pricePerM2).toBeCloseTo(e.total / 120, 6);
  });

  it('returns a per-stage breakdown aligned with the inputs', () => {
    const e = computeEstimate(defaultInputs());
    expect(e.stages.map((s) => s.key)).toEqual([
      'marcacao',
      'alvenaria',
      'vergas',
      'chapisco',
      'reboco',
    ]);
    expect(e.stages[0].subtotal).toBe(840); // 7 × 120
  });

  it('pricePerM2 is 0 when area is unset', () => {
    expect(computeEstimate({ ...defaultInputs(), area: 0 }).pricePerM2).toBe(0);
  });

  it('clamps a negative materials cost to 0', () => {
    const e = computeEstimate({ ...defaultInputs(), materialsCost: -1000 });
    expect(e.materialsWithMarkup).toBe(0);
  });

  it('zero stages yields zero labor', () => {
    const e = computeEstimate({ ...defaultInputs(), stages: [] });
    expect(e.laborTotal).toBe(0);
  });
});

describe('direct cost per unit', () => {
  it('adds (labor + direct) × qty to the subtotal and splits the totals', () => {
    const e = computeEstimate({
      stages: [
        {
          key: 'debris',
          unit: 'un',
          quantity: 3,
          dailyTeamCost: 350,
          dailyProduction: 4,
          directCostPerUnit: 350,
        },
      ],
      materialsCost: 0,
      materialsMarkupPct: 0,
      bdiPct: 0,
      area: 0,
    });
    const s = e.stages[0];
    expect(s.laborPerUnit).toBeCloseTo(87.5, 6); // 350 ÷ 4
    expect(s.directPerUnit).toBe(350);
    expect(s.laborSubtotal).toBeCloseTo(262.5, 6); // 87.5 × 3
    expect(s.directSubtotal).toBe(1050); // 350 × 3
    expect(s.subtotal).toBeCloseTo(1312.5, 6);
    expect(e.laborTotal).toBeCloseTo(262.5, 6);
    expect(e.directTotal).toBe(1050);
    expect(e.base).toBeCloseTo(1312.5, 6);
  });

  it('treats an absent or negative direct cost as 0', () => {
    const e = computeEstimate({
      stages: [
        { key: 'a', unit: 'm2', quantity: 10, dailyTeamCost: 350, dailyProduction: 10 },
        {
          key: 'b',
          unit: 'm2',
          quantity: 10,
          dailyTeamCost: 350,
          dailyProduction: 10,
          directCostPerUnit: -50,
        },
      ],
      materialsCost: 0,
      materialsMarkupPct: 0,
      bdiPct: 0,
      area: 0,
    });
    expect(e.directTotal).toBe(0);
  });
});

describe('defaults', () => {
  it('expose the reference composição stages', () => {
    expect(defaultStages().map((s) => s.key)).toEqual([
      'marcacao',
      'alvenaria',
      'vergas',
      'chapisco',
      'reboco',
    ]);
  });
});
