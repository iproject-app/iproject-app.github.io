import { describe, expect, it } from 'vitest';
import {
  BidTypeError,
  buildMaterials,
  buildStages,
  defaultIncluded,
  defaultParamValues,
  estimateArea,
  isParamVisible,
  materialPriceKey,
  validateBidType,
  type BidTypeDef,
  type ParamValues,
} from './bidType';
import { computeEstimate } from './bidEstimate';
import { securityWall } from './bidTypes/securityWall';
import { BID_TYPES } from './bidTypes';

/** Security-wall params with structural posts OFF, so face-area
 *  assertions stay at the clean 40×3 = 120 m². Posts have their own
 *  dedicated test. */
const noPosts = (over: ParamValues = {}): ParamValues => ({
  ...defaultParamValues(securityWall),
  structuralPosts: false,
  ...over,
});

const base = (): BidTypeDef => ({
  id: 't',
  labelKey: 'l',
  params: [
    { key: 'a', kind: 'number', labelKey: 'a', default: 2 },
    { key: 'flag', kind: 'boolean', labelKey: 'f', default: true },
  ],
  components: [
    {
      key: 'x',
      unit: 'm2',
      labelKey: 'x',
      optional: false,
      defaultIncluded: true,
      quantity: 'flag ? a * 10 : a',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 10 },
    },
  ],
  defaults: { materialsCost: 0, materialsMarkupPct: 0, bdiPct: 0 },
});

describe('validateBidType', () => {
  it('accepts a sound definition', () => {
    expect(() => validateBidType(base())).not.toThrow();
  });

  it('rejects duplicate param keys', () => {
    const d = base();
    d.params.push({ key: 'a', kind: 'number', labelKey: 'a', default: 1 });
    expect(() => validateBidType(d)).toThrow(/duplicate param "a"/);
  });

  it('rejects a formula referencing an undeclared param', () => {
    const d = base();
    d.components[0].quantity = 'a * ghost';
    expect(() => validateBidType(d)).toThrow(/unknown\/enum param "ghost"/);
  });

  it('rejects a formula referencing an enum param (enums drive rates, not quantities)', () => {
    const d = base();
    d.params.push({
      key: 'kind',
      kind: 'enum',
      labelKey: 'k',
      default: 'x',
      options: ['x', 'y'],
    });
    d.components[0].quantity = 'a * kind';
    expect(() => validateBidType(d)).toThrow(/unknown\/enum param "kind"/);
  });

  it('rejects a non-allowlisted function', () => {
    const d = base();
    d.components[0].quantity = 'evil(a)';
    expect(() => validateBidType(d)).toThrow(BidTypeError);
  });

  it('rejects an enum default outside its options', () => {
    const d = base();
    d.params.push({
      key: 'kind',
      kind: 'enum',
      labelKey: 'k',
      default: 'z',
      options: ['x', 'y'],
    });
    expect(() => validateBidType(d)).toThrow(/default not in options/);
  });

  it('rejects rateByEnum pointing at a non-enum param', () => {
    const d = base();
    d.components[0].rateByEnum = { paramKey: 'a', map: {} };
    expect(() => validateBidType(d)).toThrow(/not an enum/);
  });
});

describe('buildStages', () => {
  it('evaluates quantity formulas against param values', () => {
    const ct = validateBidType(base());
    const stages = buildStages(ct, { a: 2, flag: true }, { x: true });
    expect(stages[0].quantity).toBe(20);
    const off = buildStages(ct, { a: 2, flag: false }, { x: true });
    expect(off[0].quantity).toBe(2);
  });

  it('omits components that are not included', () => {
    const ct = validateBidType(base());
    expect(buildStages(ct, { a: 2, flag: true }, { x: false })).toEqual([]);
  });

  it('resolves a rate from an enum param via rateByEnum', () => {
    const d = base();
    d.params.push({
      key: 'orientation',
      kind: 'enum',
      labelKey: 'o',
      default: 'flat',
      options: ['on_edge', 'flat'],
    });
    d.components[0].rateByEnum = {
      paramKey: 'orientation',
      map: { on_edge: { dailyProduction: 20 }, flat: { dailyProduction: 12 } },
    };
    const ct = validateBidType(d);
    expect(
      buildStages(ct, { a: 1, flag: true, orientation: 'on_edge' }, { x: true })[0]
        .dailyProduction,
    ).toBe(20);
    expect(
      buildStages(ct, { a: 1, flag: true, orientation: 'flat' }, { x: true })[0]
        .dailyProduction,
    ).toBe(12);
  });
});

describe('security wall definition', () => {
  it('is registered and valid', () => {
    expect(BID_TYPES.external_security_wall).toBeDefined();
  });

  it('reproduces the reference takeoff at its defaults', () => {
    const ct = validateBidType(securityWall);
    const values = noPosts(); // 40×3, flat, no openings
    const stages = buildStages(ct, values, defaultIncluded(securityWall));

    const byKey = Object.fromEntries(stages.map((s) => [s.key, s]));
    // demolition/debris off by default (guided); foundation..reboco on.
    expect(byKey.demolition).toBeUndefined();
    expect(byKey.debris_removal).toBeUndefined();
    expect(byKey.foundation.quantity).toBe(40); // not retaining → length
    expect(byKey.marcacao.quantity).toBe(120); // 40×3 − 0
    expect(byKey.alvenaria.quantity).toBe(120);
    expect(byKey.alvenaria.dailyProduction).toBe(12); // flat
    expect(byKey.vergas.quantity).toBe(0);

    const e = computeEstimate({
      stages,
      materialsCost: 8000,
      materialsMarkupPct: 18,
      bdiPct: 27,
      area: 120,
    });
    expect(e.total).toBeGreaterThan(0);
    expect(e.materialsWithMarkup).toBeCloseTo(9440, 6);
  });

  it('on-edge lays faster than flat for the same face', () => {
    const ct = validateBidType(securityWall);
    const v = noPosts();
    const flat = buildStages(ct, v, defaultIncluded(securityWall)).find(
      (s) => s.key === 'alvenaria',
    );
    const edge = buildStages(
      ct,
      { ...v, orientation: 'on_edge' },
      defaultIncluded(securityWall),
    ).find((s) => s.key === 'alvenaria');
    expect(edge!.dailyProduction).toBeGreaterThan(flat!.dailyProduction);
  });

  it('exposes the wall face (minus openings) as the per-m² reference area', () => {
    const ct = validateBidType(securityWall);
    expect(estimateArea(ct, noPosts())).toBe(120);
    expect(
      estimateArea(ct, {
        ...noPosts(),
        // a 2.5 × 2.5 garage opening + a directly-entered 13.75 m² gate
        openings: [
          { width: 2.5, height: 2.5, area: 0 },
          { width: 0, height: 0, area: 13.75 },
        ],
      }),
    ).toBe(100); // 120 − (6.25 + 13.75)
  });

  it('openings drive both the face deduction and the lintel count', () => {
    const ct = validateBidType(securityWall);
    const stages = buildStages(
      ct,
      {
        ...noPosts(),
        openings: [
          { width: 2, height: 3, area: 0 }, // 6 m²
          { width: 0, height: 0, area: 4 }, // 4 m²
        ],
      },
      defaultIncluded(securityWall),
    );
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s.quantity]));
    expect(byKey.alvenaria).toBe(110); // 120 − 10
    expect(byKey.vergas).toBe(2); // one lintel per opening
  });

  it('validates list params and their row-derive formulas', () => {
    expect(() =>
      validateBidType({
        ...base(),
        params: [
          ...base().params,
          {
            key: 'holes',
            kind: 'list',
            labelKey: 'h',
            fields: [{ key: 'w', labelKey: 'w' }],
            rowDerive: { ghost: 'w * 2' },
          },
        ],
      }),
    ).toThrow(/rowDerive targets unknown field "ghost"/);

    expect(() =>
      validateBidType({
        ...base(),
        params: [
          ...base().params,
          { key: 'holes', kind: 'list', labelKey: 'h', fields: [] },
        ],
      }),
    ).toThrow(/list param "holes" has no fields/);
  });

  it('rejects an areaFormula referencing an undeclared param', () => {
    expect(() =>
      validateBidType({ ...base(), areaFormula: 'ghost * 2' }),
    ).toThrow(/areaFormula references unknown\/enum param "ghost"/);
  });

  it('retaining scales the footing by the reinforcement factor', () => {
    const ct = validateBidType(securityWall);
    const v = { ...noPosts(), retaining: true };
    const foundation = buildStages(ct, v, defaultIncluded(securityWall)).find(
      (s) => s.key === 'foundation',
    );
    expect(foundation!.quantity).toBe(60); // 40 × 1.5
  });

  it('debris carries a per-caçamba direct cost (skip rental) into the estimate', () => {
    const ct = validateBidType(securityWall);
    const v = {
      ...noPosts(),
      hasExistingStructure: true,
      debrisCacambas: 3,
    };
    const stages = buildStages(ct, v, {
      ...defaultIncluded(securityWall),
      debris_removal: true,
    });
    const debris = stages.find((s) => s.key === 'debris_removal');
    expect(debris?.directCostPerUnit).toBe(350);

    const e = computeEstimate({
      stages,
      materialsCost: 0,
      materialsMarkupPct: 0,
      bdiPct: 0,
      area: 0,
    });
    // 3 caçambas × R$350 rental = R$1050 of non-labor direct cost,
    // no longer invisible inside the materials lump.
    expect(e.directTotal).toBeGreaterThanOrEqual(1050);
  });

  it('demolition area is computed from measured L × H (no math for the contractor)', () => {
    const ct = validateBidType(securityWall);
    const v = {
      ...noPosts(),
      hasExistingStructure: true,
      demoLengthM: 9,
      demoHeightM: 10,
      debrisCacambas: 3,
    };
    const included = {
      ...defaultIncluded(securityWall),
      demolition: true,
      debris_removal: true,
    };
    const stages = buildStages(ct, v, included);
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s.quantity]));
    expect(byKey.demolition).toBe(90); // 9 × 10
    expect(byKey.debris_removal).toBe(3);
  });

  it('hides demolition params until "existing structure" is ticked, and ignores their stale values', () => {
    const ct = validateBidType(securityWall);
    const off = { ...noPosts(), demoLengthM: 9, demoHeightM: 10 };
    expect(isParamVisible(ct, 'demoLengthM', off)).toBe(false);
    expect(isParamVisible(ct, 'reinforcementFactor', off)).toBe(false); // retaining off

    // demolition included but structure flag off → stale 9×10 must not leak
    const stages = buildStages(ct, off, {
      ...defaultIncluded(securityWall),
      demolition: true,
    });
    expect(stages.find((s) => s.key === 'demolition')?.quantity).toBe(0);

    const on = { ...off, hasExistingStructure: true };
    expect(isParamVisible(ct, 'demoLengthM', on)).toBe(true);
  });

  it('rejects a showWhen referencing an undeclared param', () => {
    expect(() =>
      validateBidType({
        ...base(),
        params: [
          ...base().params,
          { key: 'x', kind: 'number', labelKey: 'x', default: 0, showWhen: 'ghost' },
        ],
      }),
    ).toThrow(/showWhen references unknown\/enum param "ghost"/);
  });
});

describe('bill of materials', () => {
  it('computes material quantities from the takeoff (consumption × component qty)', () => {
    const ct = validateBidType(securityWall);
    const v = noPosts(); // 40×3, no openings → face 120
    const { lines } = buildMaterials(ct, v, defaultIncluded(securityWall));
    const find = (comp: string, mat: string) =>
      lines.find((l) => l.componentKey === comp && l.materialKey === mat);

    expect(find('alvenaria', 'bloco')?.materialQty).toBe(13 * 120); // 1560 un
    expect(find('alvenaria', 'argamassa_assent')?.materialQty).toBeCloseTo(
      0.012 * 120,
      6,
    );
    // footing concrete = (footingWidthM 0.3 × heightM 3 / 3) per metre
    // × 40 m of footing = 0.3 × 40
    expect(find('foundation', 'concreto')?.materialQty).toBeCloseTo(
      0.3 * 40,
      6,
    );
    expect(find('reboco', 'argamassa_reboco')?.materialQty).toBeCloseTo(
      0.02 * 120,
      6,
    );
  });

  it('block consumption follows the chosen block/brick type', () => {
    const ct = validateBidType(securityWall);
    const base = noPosts(); // concrete vedação → 13/m²
    const blocks = (v: typeof base) =>
      buildMaterials(ct, v, defaultIncluded(securityWall)).lines.find(
        (l) => l.componentKey === 'alvenaria' && l.materialKey === 'bloco',
      )?.materialQty;

    expect(blocks(base)).toBe(13 * 120);
    expect(blocks({ ...base, blockType: 'concrete_estrutural' })).toBe(13 * 120);
    expect(blocks({ ...base, blockType: 'solid_clay' })).toBe(52 * 120);
    expect(blocks({ ...base, blockType: 'baiano' })).toBe(25 * 120);
  });

  it('footing concrete scales with buried depth (height ÷ 3 rule)', () => {
    const ct = validateBidType(securityWall);
    const base = noPosts();
    const concrete = (v: typeof base) =>
      buildMaterials(ct, v, defaultIncluded(securityWall)).lines.find(
        (l) => l.componentKey === 'foundation',
      )?.materialQty;
    // double the height → double the buried depth → double the concrete
    expect(concrete({ ...base, heightM: 6 })!).toBeCloseTo(
      2 * concrete(base)!,
      6,
    );
  });

  it('rejects consumptionByEnum pointing at a non-enum param', () => {
    expect(() =>
      validateBidType({
        ...base(),
        components: [
          {
            ...base().components[0],
            materials: [
              {
                materialKey: 'x',
                unit: 'un',
                consumption: '1',
                consumptionByEnum: { paramKey: 'a', map: { y: '2' } },
              },
            ],
          },
        ],
      }),
    ).toThrow(/consumptionByEnum param "a" is not an enum/);
  });

  it('prices blocks from the sourced reference; unsourced lines stay 0', () => {
    const ct = validateBidType(securityWall);
    const v = noPosts(); // default concrete vedação → reference R$5.30
    const { lines } = buildMaterials(ct, v, defaultIncluded(securityWall));
    const block = lines.find(
      (l) => l.componentKey === 'alvenaria' && l.materialKey === 'bloco',
    );
    expect(block?.unitPrice).toBe(5.3);
    expect(block?.lineCost).toBeCloseTo(13 * 120 * 5.3, 6);
    // mortar/concrete have no fabricated price → 0 until entered
    expect(
      lines.find((l) => l.materialKey === 'argamassa_assent')?.unitPrice,
    ).toBe(0);
  });

  it('reference block price tracks the block type (sourced ranges)', () => {
    const ct = validateBidType(securityWall);
    const priceOf = (bt: string) =>
      buildMaterials(
        ct,
        noPosts({ blockType: bt }),
        defaultIncluded(securityWall),
      ).lines.find((l) => l.materialKey === 'bloco')?.unitPrice;
    expect(priceOf('solid_clay')).toBe(1.4);
    expect(priceOf('baiano')).toBe(1.1);
    expect(priceOf('concrete_vedacao')).toBe(5.3);
    expect(priceOf('concrete_estrutural')).toBe(5.8);
    // adobe and tijolo branco have no sourced price → 0 until entered
    expect(priceOf('adobe')).toBe(0);
    expect(priceOf('tijolo_branco')).toBe(0);
  });

  it('lets the contractor override a consumption coefficient', () => {
    const ct = validateBidType(securityWall);
    const v = noPosts(); // concrete vedação → 13 blocks/m² default
    const k = materialPriceKey('alvenaria', 'bloco');
    const base = buildMaterials(ct, v, defaultIncluded(securityWall)).lines.find(
      (l) => l.componentKey === 'alvenaria' && l.materialKey === 'bloco',
    );
    expect(base?.consumptionPerUnit).toBe(13);
    expect(base?.materialQty).toBe(13 * 120);

    // override 13 → 11 blocks/m²
    const tuned = buildMaterials(
      ct,
      v,
      defaultIncluded(securityWall),
      {},
      { [k]: 11 },
    ).lines.find(
      (l) => l.componentKey === 'alvenaria' && l.materialKey === 'bloco',
    );
    expect(tuned?.consumptionPerUnit).toBe(11);
    expect(tuned?.materialQty).toBe(11 * 120);
  });

  it('prices a line from the contractor-entered unit price', () => {
    const ct = validateBidType(securityWall);
    const v = noPosts();
    const prices = { [materialPriceKey('alvenaria', 'bloco')]: 2.5 };
    const { lines, total } = buildMaterials(
      ct,
      v,
      defaultIncluded(securityWall),
      prices,
    );
    const block = lines.find(
      (l) => l.componentKey === 'alvenaria' && l.materialKey === 'bloco',
    );
    expect(block?.lineCost).toBe(13 * 120 * 2.5); // 4875
    expect(total).toBe(13 * 120 * 2.5);
  });

  it('feeds the materials total into the priced estimate', () => {
    const ct = validateBidType(securityWall);
    const v = noPosts();
    const prices = { [materialPriceKey('alvenaria', 'bloco')]: 2 };
    const { total } = buildMaterials(
      ct,
      v,
      defaultIncluded(securityWall),
      prices,
    );
    const e = computeEstimate({
      stages: buildStages(ct, v, defaultIncluded(securityWall)),
      materialsCost: total,
      materialsMarkupPct: 18,
      bdiPct: 0,
      area: 120,
    });
    expect(e.materialsWithMarkup).toBeCloseTo(total * 1.18, 6);
  });

  it('excludes materials of skipped components', () => {
    const ct = validateBidType(securityWall);
    const v = noPosts();
    const prices = { [materialPriceKey('reboco', 'argamassa_reboco')]: 500 };
    const withReboco = buildMaterials(
      ct,
      v,
      defaultIncluded(securityWall),
      prices,
    ).total;
    const withoutReboco = buildMaterials(
      ct,
      v,
      { ...defaultIncluded(securityWall), reboco: false },
      prices,
    ).total;
    // removing the reboco line lowers the total (blocks still priced
    // from the sourced reference, so it is not zero)
    expect(withReboco).toBeGreaterThan(withoutReboco);
    expect(withoutReboco).toBeGreaterThan(0);
  });

  it('rejects a material consumption formula with an unknown param', () => {
    expect(() =>
      validateBidType({
        ...base(),
        components: [
          {
            ...base().components[0],
            materials: [
              { materialKey: 'x', unit: 'un', consumption: 'ghost * 2' },
            ],
          },
        ],
      }),
    ).toThrow(/material "x".*unknown\/enum param "ghost"/);
  });
});

describe('structural posts (pilares)', () => {
  const ct = validateBidType(securityWall);
  const def = defaultParamValues(securityWall); // posts ON by default

  it('places a post at each end + one per spacing, bricks in between', () => {
    const stages = buildStages(ct, def, defaultIncluded(securityWall));
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s.quantity]));
    // 40 m / 3 m spacing → floor(13.33)+1 = 14 posts
    expect(byKey.pilares).toBe(14);
    // brick face loses the posts' vertical strip: 120 − 14×0.15×3 = 113.7
    expect(byKey.alvenaria).toBeCloseTo(113.7, 6);
    expect(byKey.marcacao).toBeCloseTo(113.7, 6);
    expect(estimateArea(ct, def)).toBeCloseTo(113.7, 6);
  });

  it('post concrete = section² × (height + buried depth)', () => {
    const { lines } = buildMaterials(ct, def, defaultIncluded(securityWall));
    const post = lines.find(
      (l) => l.componentKey === 'pilares' && l.materialKey === 'concreto',
    );
    // per post 0.15² × (3 + 3/3) = 0.09 m³ ; × 14 posts = 1.26 m³
    expect(post?.materialQty).toBeCloseTo(0.09 * 14, 6);
  });

  it('wider spacing → fewer posts → more brick face', () => {
    const wide = { ...def, postSpacingM: 5 };
    const stages = buildStages(ct, wide, defaultIncluded(securityWall));
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s.quantity]));
    expect(byKey.pilares).toBe(9); // floor(40/5)+1
    expect(byKey.alvenaria).toBeCloseTo(120 - 9 * 0.15 * 3, 6);
  });

  it('turning posts off restores the full 120 m² face and zero posts', () => {
    const stages = buildStages(
      ct,
      { ...def, structuralPosts: false },
      defaultIncluded(securityWall),
    );
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s.quantity]));
    expect(byKey.pilares).toBe(0);
    expect(byKey.alvenaria).toBe(120);
  });

  it('paint is an opt-in finish with sealer + paint material lines', () => {
    const inc = defaultIncluded(securityWall);
    expect(inc.pintura).toBe(false); // not painted by default
    const stages = buildStages(ct, def, { ...inc, pintura: true });
    const paint = stages.find((s) => s.key === 'pintura');
    expect(paint).toBeDefined();
    const { lines } = buildMaterials(ct, def, { ...inc, pintura: true });
    const mat = (m: string) =>
      lines.find((l) => l.componentKey === 'pintura' && l.materialKey === m)
        ?.consumptionPerUnit;
    expect(mat('tinta')).toBe(0.35);
    expect(mat('selador')).toBe(0.1);
  });

  it('posts are skippable for a free-standing wall', () => {
    const stages = buildStages(ct, def, {
      ...defaultIncluded(securityWall),
      pilares: false,
    });
    expect(stages.find((s) => s.key === 'pilares')).toBeUndefined();
  });
});

describe('tie beams + reference steel', () => {
  const ct = validateBidType(securityWall);
  const def = defaultParamValues(securityWall);
  const inc = defaultIncluded(securityWall);

  it('includes baldrame + top cinta by default; mid belt off', () => {
    expect(inc.baldrame).toBe(true);
    expect(inc.cintaTopo).toBe(true);
    expect(inc.cintaMeio).toBe(false);
    const stages = buildStages(ct, def, inc);
    const keys = stages.map((s) => s.key);
    expect(keys).toContain('baldrame');
    expect(keys).toContain('cintaTopo');
    expect(keys).not.toContain('cintaMeio');
  });

  it('belt concrete = width × height per metre of wall', () => {
    const { lines } = buildMaterials(ct, def, inc);
    const baldrameConc = lines.find(
      (l) => l.componentKey === 'baldrame' && l.materialKey === 'concreto',
    );
    // 0.12 × 0.12 per m × 40 m
    expect(baldrameConc?.materialQty).toBeCloseTo(0.12 * 0.12 * 40, 6);
  });

  it('reference steel: one knob (rebarKgPerM) drives posts + belts', () => {
    const { lines } = buildMaterials(ct, def, inc);
    const steel = (comp: string) =>
      lines.find((l) => l.componentKey === comp && l.materialKey === 'aco')
        ?.materialQty;
    // belts: rebarKgPerM (2) × 40 m
    expect(steel('baldrame')).toBeCloseTo(2 * 40, 6);
    expect(steel('cintaTopo')).toBeCloseTo(2 * 40, 6);
    // posts: 2 kg/m × post length (3 + 1) × 14 posts
    expect(steel('pilares')).toBeCloseTo(2 * 4 * 14, 6);
  });

  it('rebarKgPerM = 0 zeroes all reference steel (engineer not yet consulted)', () => {
    const { lines } = buildMaterials(ct, { ...def, rebarKgPerM: 0 }, inc);
    const steel = lines.filter((l) => l.materialKey === 'aco');
    expect(steel.length).toBeGreaterThan(0);
    expect(steel.every((l) => l.materialQty === 0)).toBe(true);
  });

  it('mid belt adds its concrete + steel when included', () => {
    const withMid = buildMaterials(ct, def, { ...inc, cintaMeio: true });
    const mid = withMid.lines.find((l) => l.componentKey === 'cintaMeio');
    expect(mid).toBeDefined();
    expect(
      withMid.lines.find(
        (l) => l.componentKey === 'cintaMeio' && l.materialKey === 'aco',
      )?.materialQty,
    ).toBeCloseTo(2 * 40, 6);
  });
});
