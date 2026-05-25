/**
 * External security wall — a bid type expressed as DATA.
 *
 * No takeoff logic lives here: quantities are formula strings over the
 * params, evaluated by the safe evaluator. Adding "concrete slab" later
 * is another file shaped exactly like this — no engine changes.
 *
 * Field reference (composição de preço, alvenaria de vedação):
 *  - on edge (cutelo): thinner wall, fewer blocks/m², faster alvenaria
 *  - flat (deitado): more blocks for the same face, slower
 *  - footing ≈ 1 m deep per 3 m of height; retaining → reinforced footing
 *  - demolition + debris haul-off (bota-fora) are the scope a young
 *    pedreiro forgets — guided on via "existing structure?".
 */

import type { BidTypeDef } from '../bidType';

export const securityWall: BidTypeDef = {
  id: 'external_security_wall',
  labelKey: 'bid.type.external_security_wall',
  params: [
    // The first decision: what is the wall built of. Drives blocks/m²
    // and (later) price/labor by type.
    {
      key: 'blockType',
      kind: 'enum',
      labelKey: 'bid.param.blockType',
      helpKey: 'bid.help.blockType',
      // Concrete fencing block is the typical security-wall choice.
      default: 'concrete_vedacao',
      options: [
        'solid_clay',
        'baiano',
        'baianinho',
        'laminado_21',
        'ecologico',
        'adobe',
        'tijolo_branco',
        'concrete_vedacao',
        'concrete_estrutural',
      ],
    },
    { key: 'lengthM', kind: 'number', labelKey: 'bid.param.lengthM', default: 40, min: 0, step: 1 },
    { key: 'heightM', kind: 'number', labelKey: 'bid.param.heightM', default: 3, min: 0, step: 0.1 },
    {
      key: 'orientation',
      kind: 'enum',
      labelKey: 'bid.param.orientation',
      helpKey: 'bid.help.orientation',
      default: 'flat',
      options: ['on_edge', 'flat'],
    },
    { key: 'footingWidthM', kind: 'number', labelKey: 'bid.param.footingWidthM', helpKey: 'bid.help.footingWidthM', default: 0.3, min: 0.1, step: 0.05 },
    { key: 'structuralPosts', kind: 'boolean', labelKey: 'bid.param.structuralPosts', helpKey: 'bid.help.structuralPosts', default: true },
    { key: 'postSpacingM', kind: 'number', labelKey: 'bid.param.postSpacingM', helpKey: 'bid.help.postSpacingM', default: 3, min: 0.5, step: 0.5, showWhen: 'structuralPosts' },
    { key: 'postWidthM', kind: 'number', labelKey: 'bid.param.postWidthM', helpKey: 'bid.help.postWidthM', default: 0.15, min: 0.05, step: 0.01, showWhen: 'structuralPosts' },
    { key: 'beamWidthM', kind: 'number', labelKey: 'bid.param.beamWidthM', helpKey: 'bid.help.beamWidthM', default: 0.12, min: 0.08, step: 0.01 },
    { key: 'beamHeightM', kind: 'number', labelKey: 'bid.param.beamHeightM', helpKey: 'bid.help.beamHeightM', default: 0.12, min: 0.08, step: 0.01 },
    { key: 'rebarKgPerM', kind: 'number', labelKey: 'bid.param.rebarKgPerM', helpKey: 'bid.help.rebarKgPerM', default: 2, min: 0, step: 0.1 },
    {
      key: 'openings',
      kind: 'list',
      labelKey: 'bid.param.openings',
      helpKey: 'bid.help.openings',
      fields: [
        { key: 'width', labelKey: 'bid.param.openingWidth', min: 0, step: 0.1 },
        { key: 'height', labelKey: 'bid.param.openingHeight', min: 0, step: 0.1 },
        { key: 'area', labelKey: 'bid.param.openingArea', min: 0, step: 0.1 },
      ],
      // Area auto-fills from width × height; a directly-entered area
      // wins (gates/garage openings are rarely a clean rectangle).
      rowDerive: { area: 'area > 0 ? area : width * height' },
    },
    { key: 'retaining', kind: 'boolean', labelKey: 'bid.param.retaining', helpKey: 'bid.help.retaining', default: false },
    { key: 'reinforcementFactor', kind: 'number', labelKey: 'bid.param.reinforcementFactor', helpKey: 'bid.help.reinforcementFactor', default: 1.5, min: 1, step: 0.1, showWhen: 'retaining' },
    { key: 'hasExistingStructure', kind: 'boolean', labelKey: 'bid.param.hasExistingStructure', default: false },
    { key: 'demoLengthM', kind: 'number', labelKey: 'bid.param.demoLengthM', default: 0, min: 0, step: 1, showWhen: 'hasExistingStructure' },
    { key: 'demoHeightM', kind: 'number', labelKey: 'bid.param.demoHeightM', default: 0, min: 0, step: 0.1, showWhen: 'hasExistingStructure' },
    { key: 'debrisCacambas', kind: 'number', labelKey: 'bid.param.debrisCacambas', helpKey: 'bid.help.debrisCacambas', default: 0, min: 0, step: 1, showWhen: 'hasExistingStructure' },
  ],
  components: [
    {
      key: 'demolition',
      unit: 'm2',
      labelKey: 'bid.stage.demolition',
      optional: true,
      defaultIncluded: false,
      quantity: 'demoLengthM * demoHeightM',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 25 },
      // No per-m² direct cost: demolition disposal is the skip rental,
      // billed once per caçamba on debris_removal — avoid double count.
      defaultDirectCostPerUnit: 0,
    },
    {
      key: 'debris_removal',
      unit: 'un',
      labelKey: 'bid.stage.debris_removal',
      optional: true,
      defaultIncluded: false,
      quantity: 'debrisCacambas',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 4 },
      // Skip rental + disposal per caçamba (5 m³). Brazilian field
      // reference ~R$250–500 by region; the contractor adjusts.
      defaultDirectCostPerUnit: 350,
    },
    {
      key: 'foundation',
      unit: 'm',
      labelKey: 'bid.stage.foundation',
      optional: true,
      defaultIncluded: true,
      quantity: 'retaining ? lengthM * reinforcementFactor : lengthM',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 6 },
      // Concrete per linear metre = footing width × buried depth.
      // Buried depth follows the field 1:3 rule (≈1 m per 3 m of
      // height). So a 3 m wall → ~1 m deep → width×1 m³/m. The
      // contractor calibrates width and (when retaining) the factor.
      materials: [
        {
          materialKey: 'concreto',
          unit: 'm³',
          consumption: 'footingWidthM * heightM / 3',
        },
      ],
    },
    {
      key: 'pilares',
      unit: 'un',
      labelKey: 'bid.stage.pilares',
      optional: true,
      defaultIncluded: true,
      // A post at each end + one every postSpacingM. The bricks sit
      // between them; the brick face above already subtracts the posts'
      // vertical strip.
      quantity: 'structuralPosts ? floor(lengthM / postSpacingM) + 1 : 0',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 4 },
      // Concrete per post = section × (height + buried depth). Square
      // section postWidthM²; buried depth = heightM ÷ 3 (1:3 rule),
      // same as the footing. Rebar/formwork are a later refinement.
      materials: [
        {
          materialKey: 'concreto',
          unit: 'm³',
          consumption: 'postWidthM * postWidthM * (heightM + heightM / 3)',
        },
        {
          // Reference only — bar count/diameter is an engineer's call
          // (ABNT). rebarKgPerM is one calibratable knob; post length
          // = height + buried depth.
          materialKey: 'aco',
          unit: 'kg',
          consumption: 'rebarKgPerM * (heightM + heightM / 3)',
        },
      ],
    },
    {
      key: 'baldrame',
      unit: 'm',
      labelKey: 'bid.stage.baldrame',
      optional: true,
      defaultIncluded: true,
      // Bottom tie beam on the footing, tying the posts and spreading
      // load into the soil. One linear metre per metre of wall.
      quantity: 'lengthM',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 20 },
      materials: [
        { materialKey: 'concreto', unit: 'm³', consumption: 'beamWidthM * beamHeightM' },
        { materialKey: 'aco', unit: 'kg', consumption: 'rebarKgPerM' },
      ],
    },
    {
      key: 'cintaMeio',
      unit: 'm',
      labelKey: 'bid.stage.cintaMeio',
      optional: true,
      // Mid-height belt — off by default; include it for taller or
      // more loaded walls (field practice ≈ 1.0–1.2 m up).
      defaultIncluded: false,
      quantity: 'lengthM',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 20 },
      materials: [
        { materialKey: 'concreto', unit: 'm³', consumption: 'beamWidthM * beamHeightM' },
        { materialKey: 'aco', unit: 'kg', consumption: 'rebarKgPerM' },
      ],
    },
    {
      key: 'cintaTopo',
      unit: 'm',
      labelKey: 'bid.stage.cintaTopo',
      optional: true,
      defaultIncluded: true,
      // Top tie belt — ties posts + masonry, resists wind/cracking.
      quantity: 'lengthM',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 20 },
      materials: [
        { materialKey: 'concreto', unit: 'm³', consumption: 'beamWidthM * beamHeightM' },
        { materialKey: 'aco', unit: 'kg', consumption: 'rebarKgPerM' },
      ],
    },
    {
      key: 'marcacao',
      unit: 'm2',
      labelKey: 'bid.stage.marcacao',
      optional: false,
      defaultIncluded: true,
      quantity: 'max(0, lengthM * heightM - openings_areaSum - (structuralPosts ? (floor(lengthM / postSpacingM) + 1) * postWidthM * heightM : 0))',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 50 },
    },
    {
      key: 'alvenaria',
      unit: 'm2',
      labelKey: 'bid.stage.alvenaria',
      optional: false,
      defaultIncluded: true,
      quantity: 'max(0, lengthM * heightM - openings_areaSum - (structuralPosts ? (floor(lengthM / postSpacingM) + 1) * postWidthM * heightM : 0))',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 12 },
      rateByEnum: {
        paramKey: 'orientation',
        map: { on_edge: { dailyProduction: 20 }, flat: { dailyProduction: 12 } },
      },
      // Blocks/m² from the block's exposed face (pure geometry):
      //  ceramic/concrete 39×19 → 1/(0.39×0.19) ≈ 13.5, ~13 net of
      //  joint; face brick (tijolo à vista ~0.24×0.063 incl. joint)
      //  → 1/(0.24×0.063) ≈ 64/m². Contractor calibrates.
      materials: [
        {
          materialKey: 'bloco',
          unit: 'un',
          consumption: '13',
          // Units/m² ≈ 1 ÷ exposed-face area (incl. ~1 cm joint), from
          // the table's nominal sizes. Sizes vary by maker — these are
          // reference defaults the contractor calibrates.
          consumptionByEnum: {
            paramKey: 'blockType',
            map: {
              solid_clay: '52', // ~23×7 cm face
              baiano: '25', // ~19×19 cm face
              baianinho: '33', // ~19×14 cm face
              laminado_21: '33', // ~29×9 cm face
              ecologico: '44', // modular ~30×7.5 cm, varies
              adobe: '22', // ~30×15 cm face
              tijolo_branco: '25', // white ceramic block, ~19×19 face; varies
              concrete_vedacao: '13', // 39×19 face
              concrete_estrutural: '13', // 39×19 face
            },
          },
          // Reference unit prices = indicative midpoints of the
          // Brazilian market ranges provided (clay solid ≈ R$1.0–1.8;
          // hollow clay ≈ R$0.8–1.4; laminated ≈ R$1+; concrete 14×19×39
          // ≈ R$4.5–6.2). Adobe is omitted — site-made / very local, so
          // it stays 0 for the contractor to enter. Quotes (slice 3)
          // override.
          defaultUnitPriceByEnum: {
            paramKey: 'blockType',
            map: {
              solid_clay: 1.4,
              baiano: 1.1,
              baianinho: 1.0,
              laminado_21: 1.3,
              ecologico: 1.2,
              concrete_vedacao: 5.3,
              concrete_estrutural: 5.8,
            },
          },
        },
        { materialKey: 'argamassa_assent', unit: 'm³', consumption: '0.012' },
      ],
    },
    {
      key: 'vergas',
      unit: 'un',
      labelKey: 'bid.stage.vergas',
      optional: true,
      defaultIncluded: true,
      quantity: 'openingsCount',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 12 },
      // One pre-cast/cast lintel per opening.
      materials: [
        { materialKey: 'verga', unit: 'un', consumption: '1' },
      ],
    },
    {
      key: 'chapisco',
      unit: 'm2',
      labelKey: 'bid.stage.chapisco',
      optional: true,
      defaultIncluded: true,
      quantity: 'max(0, lengthM * heightM - openings_areaSum - (structuralPosts ? (floor(lengthM / postSpacingM) + 1) * postWidthM * heightM : 0))',
      defaultRate: { dailyTeamCost: 460, dailyProduction: 100 },
      // Scratch coat slurry ≈ 0.004 m³/m².
      materials: [
        { materialKey: 'argamassa_chapisco', unit: 'm³', consumption: '0.004' },
      ],
    },
    {
      key: 'reboco',
      unit: 'm2',
      labelKey: 'bid.stage.reboco',
      optional: true,
      defaultIncluded: true,
      quantity: 'max(0, lengthM * heightM - openings_areaSum - (structuralPosts ? (floor(lengthM / postSpacingM) + 1) * postWidthM * heightM : 0))',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 10 },
      // Render mortar ≈ 0.02 m³/m² (≈2 cm thickness).
      materials: [
        { materialKey: 'argamassa_reboco', unit: 'm³', consumption: '0.02' },
      ],
    },
    {
      key: 'pintura',
      unit: 'm2',
      labelKey: 'bid.stage.pintura',
      // Finish coat — opt-in (not every wall is painted).
      optional: true,
      defaultIncluded: false,
      quantity:
        'max(0, lengthM * heightM - openings_areaSum - (structuralPosts ? (floor(lengthM / postSpacingM) + 1) * postWidthM * heightM : 0))',
      defaultRate: { dailyTeamCost: 350, dailyProduction: 40 },
      // Coverage references (calibratable, price entered by contractor):
      //  exterior acrylic ~2 coats ≈ 0.35 L/m²; sealer ≈ 0.10 L/m².
      materials: [
        { materialKey: 'selador', unit: 'L', consumption: '0.1' },
        { materialKey: 'tinta', unit: 'L', consumption: '0.35' },
      ],
    },
  ],
  areaFormula: 'max(0, lengthM * heightM - openings_areaSum - (structuralPosts ? (floor(lengthM / postSpacingM) + 1) * postWidthM * heightM : 0))',
  defaults: { materialsCost: 8000, materialsMarkupPct: 18, bdiPct: 27 },
};
