# Brainstorm — Future product directions

Raw ideas, not yet ready to be numbered stories. Captured 2026-05-10. As any
of these solidify into a buildable shape, spin them out into a numbered story
file in this directory and remove (or strike) the corresponding entry here.

## Artifacts on a project

- **Plan attachments** — PDFs / images that represent what we're building
  (architectural drawings, sketches, scope diagrams). Attach to a project,
  not to an expense.
- **Progress reports** — photo updates over time (one or many per checkpoint).
  Owner can review chronologically.

## Multi-party access (contractor view)

- A **contractor view** distinct from the owner view:
  - Contractors can see the plan + contract language for projects they're
    invited to.
  - They submit bids; multiple competing bids per project.
  - They upload progress reports during execution.
- Owner view aggregates everything: bids received, the selected contractor,
  progress reports as they come in, payment status.
- Authentication still via Auth0; the role split (`owner`, `contractor`) is
  the new dimension.

## Bids

- Owner publishes a project (with plan + contract language).
- Contractors view, submit a bid (price + duration + notes).
- Owner reviews competing bids, picks one.
- The accepted bid becomes the contract baseline (price, duration, milestones).

## Time-of-execution tracking

- Contractor commits a duration when bidding (e.g., "3 weeks").
- Track actual progress against the committed duration.
- Surface visibly: "Week 2 of 3 · on track / behind schedule".

## Payment milestones + checkpoints

This is the most concrete part of the brainstorm:

- **Upfront**: a small percentage to start (typically materials + small labor
  advance).
- **Apportioned middle**: spread the bulk over checkpoints aligned to the
  contract duration. For a 3-week contract, that's roughly weekly checkpoints.
- **Final**: held back until the owner approves the completed work.
- Each checkpoint is a **payment gate**: owner reviews the progress report,
  approves, and the corresponding payment is released (or marked as due).

Open questions:

- Who computes the schedule — auto-generated from duration + total + upfront
  %, or manually defined per project?
- What happens if a checkpoint is missed / the contractor falls behind? Do
  payments slip with the schedule, or is there a penalty mechanism?
- Are checkpoints tied to *time* (every Monday) or *deliverables* (e.g.,
  "wall framed", "wall plastered", "wall painted")? Probably deliverables for
  larger contracts, time-based for smaller ones.

## Implications for current architecture

These are not action items — just things to keep in mind as we extend the
current single-user expense tracker:

- Data model needs a **roles** layer (project members with role per project).
- Projects need a **state machine**: `draft → bidding → in_progress →
  completed`. Right now we just have an expense list.
- Contracts/plans/progress reports are file artifacts — separate storage path
  from receipts (or shared with proper tagging).
- Auth0 already supports custom claims; role assignment can live there or in
  our own data.
- `iproject` backend (Pi K3s) currently assumes one writer; multi-party means
  proper concurrency (already on the PLAN.md radar via ETag/If-Match) and
  per-user authorization.

## What this changes about scope

The current app is "personal expense tracker for construction projects". The
brainstorm above describes "construction project marketplace + execution
management". Significantly bigger product surface. Worth flagging when we're
ready to act on any of it that this is a category shift, not an incremental
feature, and we'd want to design from the data model up rather than bolting
roles onto the existing single-tenant flow.
