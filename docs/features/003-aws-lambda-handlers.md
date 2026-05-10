# 003 · Lambda handlers + S3 storage adapter

## Value delivered

A working AWS-side backend at `https://api-dev.iproject.app` that the
React app can talk to. After this story you can flip `VITE_API_BASE_URL`
in a dev build and use the AWS-hosted backend end-to-end. Production
still runs through the tunnel; this is the parallel-running story.

## Acceptance criteria

- `iproject/lambda_handlers.py` (or `iproject/handlers/`) defines an
  entry point per route, all calling into `iproject_core` (story 001).
  Routes implemented:
  - `GET  /api/projects`
  - `GET  /api/data?project=<slug>`
  - `POST /api/data?project=<slug>` (with optional `If-Match` header,
    deferred until concurrency phase)
  - `POST /api/process-receipt?project=<slug>`
  - `POST /api/upload?project=<slug>`
  - `GET  /receipts/<filename>?project=<slug>` — returns a 302 to a
    presigned S3 URL with 5-minute TTL
  - `POST /api/projects` (create project)
  - `POST /api/projects/<slug>/rename`
  - `GET  /api/fx-rate?date=...&from=...&to=...`
- A new `S3Storage` class implementing the `Storage` protocol from
  story 001:
  - `get_project_data(slug) -> dict`
  - `put_project_data(slug, data: dict) -> None`
  - `list_projects() -> list[str]`
  - `put_receipt(slug, original_name, blob) -> str` (returns canonical
    name; performs `CopyObject`+`DeleteObject` to rename if needed)
  - `get_receipt_url(slug, filename) -> str` (presigned GET URL)
  - `trash_receipt(slug, filename)` (move to `projects/{slug}/receipts/.trash/`)
- Anthropic API key fetched from Secrets Manager once per cold start,
  cached in a module-level variable.
- CORS handled: API GW returns the `Access-Control-Allow-Origin` headers
  for `https://iproject.app`; preflight OPTIONS handled by API GW
  config (not Lambda).
- E2E smoke test (run from a laptop): hit `api-dev.iproject.app` with a
  valid Auth0 JWT; verify `GET /api/projects` returns `{projects: []}`.
- E2E smoke test: drop a receipt → response includes both extracted
  fields and a canonical filename → `GET /receipts/<file>` returns the
  bytes.

## Dependencies

- Story 001 (hexagonal refactor)
- Story 002 (CDK stack)

## Implementation notes

- Lambda response size limit: 6 MB synchronous, 20 MB with response
  streaming. Receipts via presigned URLs sidesteps the limit entirely.
- Cold start latency: 256 MB / Python 3.12 / ARM64 ≈ 200–500 ms first
  request. Warm requests sub-50 ms. Acceptable for personal use; revisit
  with provisioned concurrency only if it bites.
- Idempotency on saves: not strictly needed yet (single user) but the
  concurrency story (PLAN.md Phase 6 ETag/If-Match) lands cleanly here
  because S3 supports `If-Match` natively via `IfMatch` parameter on
  `PutObject` (with ETags from `GetObject`).
- File uploads via API GW proxy: the body comes in base64-encoded for
  binary content types — same shape as the existing endpoints. No new
  parsing on the React side.

## Risk

Medium. The S3-as-blob-store pattern works but every storage operation
becomes an API call (latency, cost). With ≤100 calls/day this is fine;
flag if usage grows.
