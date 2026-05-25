# 006 · Bid metrics & gamification

## Value delivered

The dashboard starts making the contractor *better at contracting*, not
just tracking it. Win rate, average bid value, open-pipeline value,
win/loss trend over time — and light gamification (streaks, a personal
best, a "you bid X this month vs last") that gives a reason to come
back. This is the layer that turns a tracker into a habit, which is the
moat we discussed: their own history making their next bid sharper.

## Acceptance criteria

- Metrics computed from 005's bid history, per contractor:
  win rate, avg bid value, avg won value, open-pipeline value,
  won-value by month (trend).
- At least one feedback loop tying back to pricing: e.g. "your win rate
  on bids over R$ N is materially lower" — a nudge, not a number dump.
- Light gamification: current win streak, personal best month, this
  month vs last. Motivational, not manipulative — no dark patterns.
- All metrics are per-contractor and pass through `can()` (a contractor
  only ever sees their own metrics).
- Tests, no exception: pytest covers each metric's math against fixture
  bid histories incl. edge cases (zero bids, all lost, single bid);
  vitest covers the metrics view and the empty/low-data states.

## Dependencies

- 005 (bid history is the data source for every metric here).

## Implementation notes

- Pure functions over the bid-history rows; no new persistence unless a
  metric is too expensive to compute live (it won't be at family
  scale — do not pre-aggregate prematurely).
- The pricing feedback loop is the strategically important part — it is
  the single-player value that compounds. Keep it honest: surface what
  the data says, do not invent benchmarks.
- Still single-contractor. Cross-contractor leaderboards would cross a
  boundary and raise real privacy/comparison questions — explicitly
  out of scope; revisit only with a deliberate design.

## Risk

Low. Read-only math on existing data. The judgement is in *which* few
metrics matter — resist building a dashboard of twenty numbers nobody
reads.
