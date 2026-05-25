# 004 · Contractor bid: create + dashboard (the spine)

## Value delivered

A contractor can create a bid and see all their bids on one dashboard
with each bid's state (open / won / lost) and simple counts. After this
slice, you can put it in front of a real mason: he makes a bid, it's
there, he sees where it stands. This is the contractor's reason to show
up. No metrics, no gamification yet — just the working spine.

## Acceptance criteria

- A contractor (Auth0 JWT = identity) can create a bid: at minimum a
  title, a client/project label (free text for now — not yet linked to
  a real `project` entity), an amount, and a free-text scope note.
- A dashboard lists that contractor's bids, newest first, each showing
  title, amount, client label, state.
- State is one of `open | won | lost`, settable on a bid.
- Counts visible: # open, # won, # lost.
- **Every bid read/write goes through one authorization seam —
  `can(user, action, bid)`.** In this slice it is a stub: "the bid
  belongs to this user." It is *not* inlined anywhere else. This is
  non-negotiable per the RFR sequencing decision; it is what lets us
  defer OpenFGA without a retrofit.
- Backend (`iproject` repo): a `bid` table (id, owner_sub, title,
  client_label, amount, currency, scope_note, state, created_at);
  endpoints behind the existing Auth0 gate, all routed through `can()`.
- Frontend: a Bids dashboard route + a create form. EN + PT strings.
- Tests, no exception (per project rule): pytest covers create, list
  scoped to owner via `can()`, state change, and that another user
  cannot see/modify a bid (the `can()` stub denies). Vitest covers the
  dashboard (empty state, list, state change, create) and the hook.

## Dependencies

None. Deliberately not dependent on the auth model being built — only
on the `can()` seam existing.

## Implementation notes

- `can()` lives in one module. Signature stable now, body trivial.
  Later its body becomes an OpenFGA `Check`; nothing else changes.
- `client_label` is free text on purpose — linking a bid to a real
  `project`/consumer is a later slice and crosses the privacy boundary
  (out of scope here by design).
- Reuse existing patterns: the projectAdmin hook style on the frontend,
  the Postgres/db.py + server.py route style on the backend.

## Risk

Low. Single-tenant CRUD behind a stable seam. The only discipline cost
is refusing to inline ownership checks — enforce it in review.
