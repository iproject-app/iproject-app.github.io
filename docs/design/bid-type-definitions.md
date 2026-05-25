# Data-driven bid type definitions

## Problem

A bid is for one type of job (an external security wall, later a slab, a
roof). Each type has its own set of priced components and its own takeoff
math. The first cut hardcoded the wall's takeoff in TypeScript
(`wallTakeoff.ts`) — a new job type meant new code and new branching.

Masons lose money because the "levantamento de quantitativos e mão de
obra" is done mentally and forgotten scope (demolition, debris haul-off /
bota-fora) is never priced. The estimator must *guide* the pedreiro: ask
the questions, do the takeoff, price every component the same defensible
way (composição de preço).

## Approach

A **bid type is a serializable definition (data), not a module.** One
generic engine and one generic UI consume any definition. Adding a job
type is adding a definition — zero engine changes.

```
BidType
  id, label
  params:     ParamSpec[]      number | boolean | enum, with defaults
  components: ComponentSpec[]

ComponentSpec
  key, label, unit                 m2 | un | m
  optional, defaultIncluded        add/skip + guided behavior
  quantity:  "<formula string>"    takeoff math over param names
  defaultRate { dailyTeamCost, dailyProduction }   composição inputs
```

Pricing is unchanged and already generic (`bidEstimate.ts`): for each
included component, `perUnit = dailyTeamCost ÷ dailyProduction`,
`subtotal = perUnit × quantity`; sum, add materials markup, add BDI.

### Quantity formulas

Formulas are strings evaluated against the param values:
`length * height - openingsArea`, `retaining ? length * reinforcementFactor : length`.
Booleans are 0/1; enums affect *rates*, not quantities, so the formula
language stays numeric and string-free.

Grammar (recursive descent): ternary, `|| &&`, comparisons,
`+ - * /`, unary `- !`, numeric literals, identifiers (resolved only
from the supplied param scope), and a fixed builtin set
`max min abs ceil floor round`. Nothing else.

## Security considerations

Definitions are data — the whole point is they eventually live in
JSON/DB and may be authored outside code review. A quantity string is
**evaluated**, so it is untrusted input.

- **What we expose:** evaluation of arithmetic expressions over a fixed
  numeric scope. No I/O, no app state.
- **Attack surface:** code injection via the formula string; DoS via
  pathological input.
- **Mitigations — non-negotiable:**
  - No `eval`, no `Function`, no template evaluation. A hand-written
    tokenizer + parser only.
  - No member access, no indexing, no property names — identifiers
    resolve solely from the provided param map; an unknown identifier or
    function is a hard parse/validation error, not a runtime surprise.
  - Fixed builtin allowlist; no access to `globalThis`, `Math`, or any
    host object.
  - Input length cap and AST depth cap to bound parse/eval cost.
  - Non-finite results (div-by-zero, overflow) clamp to 0 at the engine
    boundary, consistent with the existing composição clamping.
  - Definitions are validated up front: every formula must parse and may
    reference only declared params. A type cannot be used until it
    passes validation.

## Status

Slice 1 (this change): safe evaluator + tests. Subsequent slices:
definition schema + validator, the security-wall definition as data,
generic estimate binding, definition-driven UI.
