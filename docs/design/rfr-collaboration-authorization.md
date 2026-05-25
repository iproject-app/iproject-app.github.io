# RFR · Collaboration platform — authorization model

Status: **living draft**. Nothing implemented. Captures decisions made
in design discussion; open items are marked as such, not resolved.

## Context

The app today is a single-user expense tracker. The direction is a
collaboration platform where consumers manage project budgets and
contractors bid on and work those projects. The broader market thesis
(underserved Brazilian contractor tier, WhatsApp-native, pricing
confidence) is still forming and is deliberately **not** structured
here — this RFR scopes only the authorization model, which is the part
that has converged.

## Core decisions

1. **Relationship-based access control (ReBAC), not hand-rolled, not
   plain RBAC.** Roles must be cheap to add. We will not attempt to
   enumerate all personas/objects up front — that is the risk we are
   explicitly avoiding. New personas become new relations or entities,
   not schema rewrites.

2. **OpenFGA** (Google Zanzibar model) as the authorization service —
   *revised from Permify*. Same ReBAC semantics; the model below ports
   directly (only DSL syntax differs). Rationale for the switch:
   - OpenFGA is the open engine behind **Auth0 FGA**. We already run
     Auth0, so the stateful-service-on-the-Pi cost is *optional*:
     self-host the free OpenFGA binary now, lift to Auth0-managed FGA
     later on the identical model/API with no lock-in. Permify has no
     comparable managed escape hatch.
   - Apache-2.0 (OpenFGA) vs AGPL-3.0 (Permify core) — safer for a
     platform/business trajectory.
   - CNCF governance vs single-vendor; Permify was just acquired by
     FusionAuth (docs now under fusionauth.io/permify-docs) — the
     single-vendor risk already materializing.
   Counter-argument on record: prior team experience is with Permify
   (lower bootstrap cost). That is the one factor favoring Permify; the
   Auth0-managed optionality outweighs it. SpiceDB rejected as not
   lightweight; Cerbos rejected as policy/ABAC, wrong model for the
   relationship-graph + list-filtering this design needs.

3. **Authn stays Auth0; authz moves to Permify.** Auth0 identifies the
   user (JWT `sub`); Permify answers "can this subject do this on this
   object." Separation is clean and already half in place.

4. **"Team" is not an entity.** A team is the set of relation tuples on
   an object. There is no team table.

5. **Two private cost ledgers + one shared boundary object.** A project
   is not one shared budget. Client-side costs and contractor-side costs
   are each private to their side. The **bid** is the only figure both
   sides see. Nothing is shared by default.

6. **Tax-deductibility is data, never an authorization input.** It is a
   field on a cost (flag, maybe category), identical whether the cost is
   client- or contractor-side. Each side reports its own ledger; the
   ledgers do not merge because both happen to be deductible.

7. **Contractor employees are internal to the contractor.** The consumer
   does not care which employee acted, only that the contractor did.

8. **Admin is two separate mechanisms, both outside the schema.**
   - *View-as* (impersonation): the app runs the authz `Check` with
     `subject = target` and renders exactly the target's view. No schema
     change; does **not** break the cost-ledger boundary (you see only
     what that subject sees). This is the primary tool for "what does a
     contractor see." Audit-logged: who viewed as whom, when.
   - *God-view* (see everything, across the client/contractor
     boundary): a deliberate, named exception to the primary invariant
     (#5). Kept as an explicit application-layer break-glass, **not**
     `or platform.admin` smeared across every permission — so the schema
     still *proves* the privacy boundary for all non-break-glass access.
     Single chokepoint, heavily audited.

## Current schema (the converged cut)

```perm
entity user {}

entity project {
    relation owner      @user
    relation member     @user      // co-payers: e.g. wife, father
    relation contractor @contractor

    permission view       = owner or member or contractor.lead or contractor.worker
    permission contribute = owner or member or contractor.lead or contractor.worker
    permission manage     = owner
}

entity contractor {
    relation lead   @user          // adds and manages info for the contractor
    relation worker @user          // adds info only
}

entity bid {
    relation contractor @contractor
    relation project     @project

    permission view   = contractor.lead or contractor.worker or project.owner
    permission edit   = contractor.lead
    permission accept = project.owner
}

entity cost {
    relation project    @project       // a client-side cost (only this set)
    relation contractor @contractor    // a contractor-side cost (only this set)

    permission view = project.owner or project.member
                    or contractor.lead or contractor.worker
}
```

`cost.view` is correct *because* exactly one of `project` /
`contractor` is populated per cost row: a client receipt resolves to
owner/member only; a contractor labor cost resolves to that
contractor's people only.

## Security considerations

This RFR *is* a security model, so the considerations are the content,
not an appendix:

- **Primary invariant:** the client/contractor cost-ledger boundary.
  Contractor never sees client travel/receipts; client never sees
  contractor labor cost/margin. The `bid` is the sole sanctioned
  crossover.
- **Authn vs authz split:** compromised authz service ≠ compromised
  identity, and vice versa. Permify gets the JWT `sub` as subject; it
  never mints identity.
- **Default-deny:** absence of a relation tuple denies. Sharing is an
  explicit relation, never implicit.
- **Non-authorization data stays out of the schema:** deductibility,
  amounts, categories never enter permission logic — keeps the policy
  surface small and auditable.

## Open / deliberately deferred

- Full persona/object enumeration — intentionally not done.
- `organization` as a first-class entity (contractor company, household)
  vs. the current minimal `contractor` entity — deferred until real.
- Contractor scoped to the **project/budget** vs. scoped to a
  **contract/bid** — raised, **not decided**. Determines whether a
  contractor can ever see the consumer's broader spend. Decide before
  contractors touch real client data.
- Bid-vs-actual reconciliation ("materials may or may not be in the
  bid") — a feature on top of this model, not part of it.
- Whether `member` can view bids — decided **no** for now (owner-only,
  since accept is an owner decision); revisit if needed.
- Operational cost of running Permify (stateful service + its own
  Postgres on the cluster) — a deliberate infra add, not yet scheduled.

## Sequencing decision

Value before plumbing. Build order:

1. **Contractor bid dashboard** first (single contractor: Auth0 JWT =
   identity). The demonstrable value; the contractor's reason to show
   up. First slice = the spine: create a bid, see it on a dashboard,
   see state (open / won / lost) and counts. Gamification/win-metrics
   are a later layer on the spine, not the first slice.
2. **All bid access goes through one authorization seam** —
   `can(user, action, bid)` — from day one. Today: a stub ownership
   check. Later: an OpenFGA call. Non-negotiable; it is the entire
   price of doing dashboards-first without a painful retrofit.
3. **OpenFGA stood up only when contractor data meets client data.**
   Until then the privacy invariant is not in play (a contractor's own
   bids cross no boundary). The model here is designed, not built;
   nothing in it is at risk by this ordering.

## Relationship to existing backlog

The artifact stories (`docs/features/001–003`: plans, progress reports,
polish) are not invalidated — they become foundation under this model
(plans/progress are project-scoped objects with the same relations).
They re-sequence beneath this once the platform direction is committed.
