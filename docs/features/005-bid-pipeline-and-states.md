# 005 · Bid pipeline & states

## Value delivered

The dashboard becomes a pipeline, not just a list. A contractor sees
their bids grouped by stage with the money attached to each stage —
"R$ X in open bids, R$ Y won this month." This is the first slice where
the dashboard answers a question the mason actually has: *how much work
is in front of me and how much did I land?*

## Acceptance criteria

- Bid states extend to a real pipeline: `draft → sent → open → won |
  lost` (exact set confirmed at slice start; keep it short).
- Dashboard groups bids by stage with per-stage count **and summed
  amount**.
- "Won this month" / "open pipeline value" headline figures.
- State transitions are explicit actions, validated server-side
  (can't jump `draft → won`); each transition still passes through
  `can(user, 'transition', bid)`.
- A bid carries a small history (state, timestamp) so the pipeline is
  auditable and later metrics (006) have data to compute from.
- Tests, no exception: pytest covers legal/illegal transitions, summed
  amounts per stage, history append; vitest covers the grouped view
  and headline figures.

## Dependencies

- 004 (the spine: bid entity, dashboard, `can()` seam).

## Implementation notes

- State machine is a tiny explicit table of allowed transitions, not
  scattered `if`s — 006's metrics and any future client-side bid
  acceptance will hang off the same transitions.
- History is append-only rows; do not mutate prior state in place.
  Cheap now, and it is the substrate for win-rate/velocity later.
- Still single-contractor. No client/consumer interaction with the bid
  yet — that crosses the privacy boundary and is out of scope here.

## Risk

Low–medium. The only real care is getting the transition set right and
not letting state logic leak out of the one state-machine module.
