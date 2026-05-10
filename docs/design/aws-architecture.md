# AWS Lambda + S3 + API Gateway — design sketch

Captured 2026-05-10 from the conversation about whether to migrate the
backend from the current Pi K3s + Cloudflare Tunnel setup to AWS-managed
serverless. Not a decision yet — a design candidate to compare against
"keep it on a Pi" and the brainstormed contractor-view product expansion.

## Goal

Replace the Pi K3s backend (currently running on Joe's laptop, exposed via
`cloudflared` at `api.iproject.app`) with AWS-managed serverless components,
preserving the public contract:

- `https://iproject.app` (React SPA, GH Pages) → unchanged
- `https://api.iproject.app/api/*` → AWS API Gateway (instead of tunnel)

## Components

```
            iproject.app (GH Pages, React SPA)
                       │  Authorization: Bearer <jwt>
                       ▼
               api.iproject.app  (Cloudflare DNS only)
                       │
                       ▼
        ┌──────────────────────────────┐
        │  AWS API Gateway (HTTP API)  │
        │  ─ JWT authorizer ──► Auth0  │
        └──────────────┬───────────────┘
                       │  invoke
                       ▼
        ┌──────────────────────────────┐
        │  AWS Lambda (Python)         │
        │  ─ /api/projects             │
        │  ─ /api/data                 │
        │  ─ /api/process-receipt      │
        │  ─ /receipts/<file>          │
        │  ─ /api/fx-rate              │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴───────────────┐
        │                              │
        ▼                              ▼
 [Anthropic API]              [S3: iproject-prod]
   (Claude OCR)                projects/<slug>/data.json
                               projects/<slug>/receipts/*
```

## Request flows

### Read project list

```mermaid
sequenceDiagram
  Browser->>API GW: GET /api/projects
  API GW->>Auth0 JWKS: validate JWT (cached)
  API GW->>Lambda: invoke list-projects
  Lambda->>S3: ListObjectsV2 (prefix=projects/)
  Lambda-->>Browser: { projects: [...] }
```

### Save data (the hot path)

```mermaid
sequenceDiagram
  Browser->>API GW: POST /api/data?project=back-wall
  Note over API GW: Bad JWTs rejected at the edge<br/>(no Lambda invocation)
  API GW->>Lambda: invoke save-data
  Lambda->>S3: PutObject projects/back-wall/data.json
  Lambda-->>Browser: { ok: true }
```

### Process receipt (multimodal)

```mermaid
sequenceDiagram
  Browser->>API GW: POST /api/process-receipt
  API GW->>Lambda: invoke process-receipt
  Lambda->>S3: PutObject (raw bytes, deterministic key)
  Lambda->>Anthropic: extract fields (Claude Sonnet vision)
  Anthropic-->>Lambda: structured fields
  Lambda->>S3: CopyObject (canonical filename)
  Lambda-->>Browser: { fields, filename }
```

### View receipt (presigned URL trick)

```mermaid
sequenceDiagram
  Browser->>API GW: GET /receipts/foo.jpg
  API GW->>Lambda: invoke get-receipt
  Lambda->>S3: generate_presigned_url (GET, 5 min TTL)
  Lambda-->>Browser: 302 Location: <presigned S3 URL>
  Browser->>S3: GET <presigned URL>
  S3-->>Browser: bytes (direct, no Lambda proxy)
```

Why presigned: receipts can be megabytes. Streaming through Lambda burns
compute time and adds Lambda response-size limits. Browser fetches direct
from S3; Lambda just signs a short-lived URL.

## Storage layout

```
s3://iproject-prod/
└── projects/
    └── back-wall/
        ├── data.json
        └── receipts/
            ├── 2026-05-04_pix-500_francisco.jpeg
            ├── 2026-05-05_eiselle-662.jpeg
            └── …
```

No database. The `data.json` blob model from `server.py` carries over
verbatim — S3 `PutObject` replaces `save_data()`, S3 `GetObject` replaces
`load_data()`. Same shape the React app already speaks.

For multi-tenant (contractor view from the brainstorm), prefix with the
owner's Auth0 sub:

```
s3://iproject-prod/
└── users/
    └── auth0|abc123/
        └── projects/
            └── back-wall/
                ├── data.json
                └── receipts/
```

Or split by role. Decide at multi-tenancy time.

## Auth

- API Gateway HTTP API has a built-in **JWT authorizer**. Configure it with
  the Auth0 JWKS URL + audience (`https://api.iproject.app`) + issuer
  (`https://dev-ngomqe3vh6l2mszt.us.auth0.com/`). Keys cached for an hour.
- Invalid tokens get rejected at the edge — no Lambda invocation, no charge.
- The React side and the Auth0 tenant don't change at all.

## Deployment

Three options, ranked:

1. **AWS CDK (TypeScript)** — define stack as code: API GW + Lambda + S3
   bucket + IAM roles + Cloudflare DNS record (via the Cloudflare CDK
   provider, optional). Deploy with `cdk deploy`. Lives in `iproject/infra/`.
   Most flexible, infra-as-code.
2. **AWS SAM** — declarative YAML, simpler for pure Lambda+API GW apps but
   less flexible.
3. **Serverless Framework** — third-party, works fine but adds a dep.

CDK is the recommendation. Mention infra/ would import `pyiproject_core`
(or wherever the domain logic lives) as a Lambda layer or zipped dep.

## Local dev

Keep `server.py` as the fast dev loop. Lambda handlers become a thin
adapter that calls the same domain functions:

```python
# domain.py — pure logic, no HTTP, no storage backend assumed
def process_receipt(slug, blob, original, *, store, ai, contacts): ...
def list_projects(store): ...
def load_data(slug, store): ...

# server.py — local dev driver, filesystem store
class Handler(BaseHTTPRequestHandler):
    def do_POST(self): ...

# lambda_handlers.py — production driver, S3 store
def process_receipt_handler(event, context): ...
```

Two drivers, one core. Hexagonal: store and AI clients are injected.
SAM CLI also works (`sam local start-api`) but adds startup latency vs
plain `python server.py`.

## Cost (family-scale, ~100 calls/day)

| Service | Free tier | Estimated use | Cost |
|---|---|---|---|
| API GW HTTP API | 1M req/month free | ~3k/month | $0 |
| Lambda | 1M req + 400k GB-sec/month free | ~200 GB-sec/month | $0 |
| S3 storage | 5GB free first year | <1GB | $0 → ~$0.02/mo year 2+ |
| S3 requests | $0.005 / 1000 PUT, $0.0004 / 1000 GET | minor | <$0.05/mo |
| Data transfer | S3↔Lambda free same-region | n/a | $0 |
| CloudWatch logs | 5GB ingestion + 5GB storage free | minor | $0 |
| **Subtotal AWS** | | | **~$0–0.10/mo** |
| Claude API | (already paying) | unchanged | unchanged |

A 10x growth in usage stays in or near free tier indefinitely.

## Security considerations

- **IAM**: Lambda execution role grants only `s3:GetObject`, `s3:PutObject`,
  `s3:ListBucket` on the specific bucket prefix. No wildcard access.
- **S3 bucket**: `BlockPublicAccess: true`, default SSE-S3 encryption,
  versioning enabled (cheap protection against accidental overwrite/delete).
- **API GW**: HTTPS only (TLS 1.2+). JWT authorizer rejects bad tokens at
  edge before Lambda invokes.
- **Secrets**: Anthropic API key in **AWS Secrets Manager** (or SSM
  Parameter Store SecureString). Lambda reads at cold start, caches in
  memory. Never in env vars committed to repo.
- **CORS**: API GW configured for `Access-Control-Allow-Origin:
  https://iproject.app` (and `http://localhost:5173` for dev). Same as
  current `server.py`.
- **Presigned URLs**: 5-minute TTL on receipt GETs. Short enough that a
  leaked URL has limited blast radius.
- **Logging**: CloudWatch retention 30 days. PII (payee names) appears in
  logs only if explicitly logged — keep them out of `INFO`-level prints.
- **Rate limiting**: API Gateway has burst + steady-state quotas; configure
  per-route to prevent runaway costs from a misbehaving client.

## Trade-offs vs Pi K3s (the path PLAN.md originally outlined)

| | AWS | Pi K3s |
|---|---|---|
| Up-front work | meaningful rewrite (~2–3 days) | almost zero (running today) |
| Ongoing ops | none (managed) | low (Pi 24/7, occasional updates) |
| Resilience | regional + redundant | depends on home power/network |
| Vendor lock-in | yes (AWS) | minimal (Cloudflare for DNS only) |
| Multi-tenant readiness | excellent | manageable, more careful |
| Cost | ~$0/mo | ~$0/mo (electricity ~$2/yr) |
| Latency from Brazil | 50–80ms (us-east-1) | depends on home upstream |
| Cold start | 200–800ms first call after idle | none |

## When to choose AWS

- The contractor-view product (multi-tenant, uptime matters, can't depend
  on home internet) is on the near-term roadmap.
- You want to stop thinking about the laptop/Pi at all.

## When to stay on Pi K3s

- Personal-only use stays the steady state.
- You'd rather invest the 2–3 days into product features than infra.

## Out of scope here

- CloudFront in front of API GW (only useful if we cache, which we don't).
- DynamoDB instead of S3-as-blob (more capable but more migration; S3 is fine
  for the current data shape).
- A second region or multi-AZ posture (overkill for personal use).

## Decision log

This document captures a candidate, not a chosen path. Decision pending
against:

1. Pi K3s as `docs/PLAN.md` originally outlined (no rewrite).
2. Cloudflare Workers + R2 (similar serverless model, stays on Cloudflare,
   would require porting `server.py` to TS).
3. This AWS sketch.
