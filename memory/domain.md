# Domain Knowledge

> This file is **read-only for all agents**. Only humans may edit it.
> It is the ground truth about the business, its constraints, and its security policies.

## Tech stack

- Backend: Go (primary), TypeScript (tooling/scripts)
- Frontend: React + TypeScript
- Infrastructure: Kubernetes on AWS (EKS), Terraform
- Secrets: HashiCorp Vault
- CI/CD: GitHub Actions
- Observability: OpenTelemetry → Grafana + Loki

## Security policies

- All secrets via Vault — never in env vars, never in code
- No PII logged in plaintext
- Auth uses OIDC; signing keys rotate every 90 days
- JWKS dual-publish window: 36h for consumers with long cache TTLs
- SOC2 CC6.1: audit logs are append-only, minimum 400-day retention
- GDPR: no PII stored outside EU without DPA review

## Deployment constraints

- Canary required for all production changes (5% → 50% → 100%)
- No deploys to production between 22:00–06:00 UTC without on-call approval
- Rollback must be executable in < 2 minutes
- QA and Security must both pass before any deploy

## Known service quirks

- `jira-legacy`, `looker`, `hubspot-bridge`: JWKS cache TTL > 24h — use 36h skew window for key rotations
- `sso-smoke/google-workspace`: flaky within 60s of a deploy — retry once before failing
- DevOps canaries to `ap-south-1` are ~4× slower than other regions — budget accordingly
- `billing-worker` and `stripe-bridge` are migration holdouts for auth-v2 — treat as high-risk

## Escalation contacts

- On-call: pagerduty/infra-oncall
- Security P0: security@company.internal + PagerDuty
- Compliance: legal@company.internal
