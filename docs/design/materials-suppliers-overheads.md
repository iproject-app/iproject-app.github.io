# Materials, suppliers, and overheads

## Problem (current state is a placeholder)

The estimator prices **labor** properly (composição per component) but
collapses everything else into one number: `Materials cost (R$)` + a
markup, plus a BDI %. That is not a bid materials model. It cannot
answer the questions a contractor actually has:

- **How do I know how much material I need?** Today: he guesses a lump.
- **What kind of brick/block?** There is no brick type. The whole
  estimate silently assumes one block. White brick, concrete block,
  tijolo baiano — different blocks/m², different price, different pace.
- **Whose price?** Contractors get 2–3 quotes per material from
  different depósitos. There is nowhere to compare them.
- **Freight / transport?** Delivery is a real, often large cost,
  especially for sand, blocks, and rebar. Invisible today.
- **Site security?** Watchman / fencing on an exposed job. Invisible.
- **Finishes (reboco / revestimento / azulejo)?** `chapisco` and
  `reboco` exist as *labor* only — no mortar, no tile, no adhesive,
  no grout costed.

## Model

Materials work exactly like labor already does: a **per-component
takeoff**, not a guess. Each component gets a **bill of materials** —
a list of material lines:

```
MaterialLine
  materialKey            cement | sand | block | rebar | tile | adhesive | grout | …
  unit                   un | kg | m3 | saco | m2
  consumption  "<formula>"   amount of material PER component-unit,
                             over the same params (safe evaluator)
  quoteKey               which supplier quote prices this line
```

Component material subtotal = `consumption(params) × quantity ×
quoteUnitPrice`. Sum across components → the materials total that
replaces the lump. Markup applies to materials; BDI on top — unchanged.

### Brick / block type

A new enum param `blockType` (alongside `orientation`). It drives, via
the existing `rateByEnum` pattern generalized to materials:

- blocks per m² (consumption coefficient)
- the block's supplier quote (different SKU/price)
- optionally alvenaria pace (some blocks lay faster)

Adding a block type is data, not code — same principle as bid types.

### Suppliers and quotes

A definition/bid carries a `quotes` set: per `materialKey`, one or more
`{ supplierName, unitPrice, freightCost?, validUntil? }`. The contractor
enters the 2–3 prices he collected; the UI shows **min / median / max**
so the bid is negotiable and he can see his exposure. He selects the
quote per material (default: cheapest). Freight is a quote attribute
(delivered price) or a separate transport line when freight is shared
across materials.

### Overheads (separate from BDI)

Project-level direct costs that are **not** per-m² and **not** BDI:
site security/watchman, fencing, temporary power/water, equipment
rental. Explicit named overhead lines with a cost and a basis
(one-off, per-day × duration). BDI stays what it is — admin + profit —
applied after.

### Finishes

`chapisco` / `reboco` get their material BOM (cimento, areia, cal).
Add an optional component **`revestimento_ceramico`** (azulejo): area
driven, BOM = tile m² + adhesive (kg/m²) + grout (kg/m²) + ~10% waste.
Skippable like any component.

## "How does he know the quantity?"

The app computes it from the takeoff using **reference consumption
coefficients** (SINAPI / TCPO-style: e.g. ~13 blocos/m² for 9×19×39
laid flat, assentamento mortar ≈ 0.012 m³/m², reboco ≈ 0.02 m³/m²,
cimento sacos per m³, etc.) — reference defaults the contractor
calibrates, exactly like the labor rates. **These coefficients and any
market prices must come from a real source (SINAPI table, TCPO, or the
contractor's own history). I will not fabricate them** — where a real
figure is needed and not sourced, the field ships empty with the
source noted, not invented.

## Security considerations

- Consumption formulas reuse the existing safe evaluator — **no new
  evaluation surface**; validated up front like quantity formulas.
- Supplier names/prices are user data — numeric prices clamped
  (negative/junk → 0); supplier names are display-only text, never
  evaluated.
- No secrets; quotes are bid-local.

## Delivery sequence (value-ordered)

1. **BOM engine + materials total** — components carry material lines;
   the lump is replaced by a computed, itemized materials total. One
   reference block type. (Foundation for everything else.)
2. **Block type** — `blockType` enum driving consumption + price.
3. **Supplier quotes** — multiple prices per material, selection,
   min/median/max spread shown.
4. **Transport + overheads** — freight per quote; named overhead lines
   (security, etc.) separate from BDI.
5. **Finishes** — reboco/chapisco BOM + optional azulejo component.

Each slice is demonstrable on its own and ships with tests.
