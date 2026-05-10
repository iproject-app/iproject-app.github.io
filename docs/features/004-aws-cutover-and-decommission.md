# 004 · Cutover from Cloudflare Tunnel to AWS

## Value delivered

Production traffic flows through the AWS-managed backend. The Cloudflare
Tunnel + laptop dependency goes away. The system survives laptop
shutdowns, network changes, and is reachable from anywhere with the same
SLA AWS gives any small Lambda app.

## Acceptance criteria

- Data migration: every project's `data.json` and every receipt copied
  from `~/business/code/iproject-app/iproject/projects/` into
  `s3://iproject-prod/projects/`. Verified by:
  - Same SHA-256 hashes for receipts before/after.
  - `data.json` round-trips through `S3Storage.get_project_data()` to
    the same dict the FilesystemStorage returns.
  - A diff script reports zero entries lost.
- DNS cutover: `api.iproject.app` switches from the Cloudflare Tunnel
  CNAME to the API Gateway custom-domain CNAME. Tunnel left running for
  a one-week safety window, but no traffic should reach it.
- The React app (no code change) calls `https://api.iproject.app/api/*`
  and gets data from S3-via-Lambda. Smoke checked:
  - List projects.
  - Open project, see all expenses.
  - View receipt (presigned URL works in the browser).
  - Add an expense + receipt; reload; see it persisted.
  - Edit + delete an expense.
- The persistent launchd plist for `cloudflared` is removed:
  `launchctl unload -w ~/Library/LaunchAgents/app.iproject.cloudflared.plist`
  then delete the plist.
- The local `iproject` server stays runnable for dev; documented in
  `iproject/docs/PLAN.md` that prod is now AWS.

## Dependencies

- Story 003 (Lambda handlers fully working in `dev` stage)
- Operational: an AWS bill alert at $5/month so any drift surfaces.

## Implementation notes

- **Cutover plan**:
  1. Promote the dev stack to a `prod` stack via `cdk deploy --context env=prod`.
  2. Manually run a migration script: `python -m iproject_core.migrate
     --from filesystem --to s3 --bucket iproject-prod`. Runs locally,
     reads from `projects/`, writes to S3.
  3. Verify with the diff script (in CI? In the migrate command?).
  4. In Cloudflare DNS: switch `api.iproject.app` from the tunnel CNAME
     to the API GW custom-domain CNAME. TTL ≤ 5 min during cutover.
  5. Watch CloudWatch logs and the React app for an hour.
  6. After 24h with no anomalies, stop accepting writes via the tunnel
     (firewall localhost:8765 from outside) but leave the tunnel alive
     for one week as fallback.
  7. After one week: kill the tunnel + plist.
- **Backups**: enable S3 cross-region replication for `iproject-prod` to
  a second bucket in another region. Free until 5 GB; ~$0.02/mo after.
  Belt-and-suspenders for the irreplaceable receipts.
- **Monitoring**: a basic CloudWatch alarm on Lambda 5xx error rate
  (>5% over 5 minutes), routed to email or Slack. Cheap insurance.

## Risk

Medium-high — this is the only story in the AWS path that's irreversible
without the previous DNS flip. Mitigation: keep the tunnel running for a
week, have a `prod` rollback plan that flips DNS back. Test the full
flow against `api-dev.iproject.app` first end-to-end before touching
`api.iproject.app`.
