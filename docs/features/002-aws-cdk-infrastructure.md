# 002 · AWS CDK infrastructure for the backend

## Value delivered

A reproducible AWS stack — API Gateway HTTP API + Lambda + S3 + IAM +
Secrets Manager — defined entirely in code. After this story the
infrastructure exists in a non-prod stage and the team can deploy
arbitrary handlers to it; production traffic still flows through the
Cloudflare Tunnel.

## Acceptance criteria

- `iproject/infra/` contains a CDK (TypeScript) app with one stack:
  `IprojectBackendStack`, parameterized by environment (`dev`, `prod`).
- Resources created by `cdk deploy --context env=dev`:
  - **S3 bucket** (`iproject-{env}-data`): private, SSE-S3, versioned,
    `BlockPublicAccess` on, lifecycle rule keeping noncurrent versions
    30 days.
  - **Lambda function** (`iproject-{env}-api`, Python 3.12, ARM64,
    256 MB, 30s timeout). Code is a placeholder router that returns
    `{ ok: true, env, route }` so the stack is testable end-to-end.
  - **IAM role** for the Lambda granting only `s3:GetObject`,
    `s3:PutObject`, `s3:ListBucket`, `s3:CopyObject`,
    `s3:DeleteObject` on the bucket prefix.
  - **API Gateway HTTP API** with a JWT authorizer pointing at the
    Auth0 tenant + audience `https://api.iproject.app`, default
    `Authorization` header. Single `$default` route → Lambda.
  - **Custom domain**: `api-{env}.iproject.app` for dev,
    `api.iproject.app` reserved for prod. Domain verification done via
    ACM (DNS validation through Cloudflare).
  - **CloudFormation Output**: API GW endpoint URL + ACM cert ARN +
    S3 bucket name.
- `iproject/infra/README.md` documents `cdk deploy`, `cdk diff`, and
  bootstrap requirements.
- Anthropic API key stored in **AWS Secrets Manager** under
  `iproject/{env}/anthropic-api-key`. Lambda role grants
  `secretsmanager:GetSecretValue` on that ARN only.
- A health check route (`GET /api/health`) returns `{ ok: true }` and
  proves end-to-end the stack is reachable through the API GW JWT
  authorizer.

## Dependencies

Story 001 isn't strictly required for this story — the stack is
infrastructure-only — but story 003 does need 001 first.

## Implementation notes

- Pin CDK version in `package.json`. Use `aws-cdk-lib` v2.
- `cdk bootstrap` once per AWS account/region; documented.
- Use a single account, two stages. No multi-account complexity for
  family-scale.
- DNS: don't migrate `api.iproject.app` away from Cloudflare Tunnel
  yet. This story creates `api-dev.iproject.app` only.
- Cost guardrail: enable AWS Budgets alert at $5/mo so any runaway gets
  a warning email.

## Risk

Medium. CDK + AWS account setup is fiddly the first time but each
resource is well-trodden. The biggest gotcha is ACM cert validation
through Cloudflare DNS (needs the DNS challenge record added to the
Cloudflare zone — manual or via Cloudflare CDK provider).
