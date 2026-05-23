# Roadmap

<!-- HUMAN-SEEDED — Do not modify without human approval -->

## [Human-seeded] Quarterly objectives

Through Q3, the team optimises for **reliability over feature throughput**. Any run whose plan trades reliability for shipping speed must escalate to a human before execution.

- Ship per-tenant audit trails
- Get p99 of `/search` under 280ms
- Zero P0 security incidents for the quarter

## [Human-seeded] Compliance commitments

The CTO must never approve a change that would violate:
- SOC2 CC6.1 — audit-log immutability (no rewrites, no shortening of retention)
- GDPR — no PII in non-EU storage without DPA review
- Internal: no production change without QA and Security pass between 22:00–06:00 UTC

## [Human-seeded] Frozen surfaces

Changes to these paths require explicit human approval before the CTO may proceed:
- `infra/` — infrastructure definitions
- `migrations/` — database migrations
- `auth/` — authentication and authorisation
- `payments/` — payment processing
- `.github/` — CI/CD pipeline definitions
- `agent/` — the agent system itself
- `memory/domain.md` — this policy document

---
<!-- CTO-MAINTAINED — Updated by CTO Agent after each run -->

## [CTO-maintained] Active initiatives

- **login-page** — run_a1b2c3d4 complete. Code approved. 5 pre-production security conditions outstanding (see decisions.md ADR-001) — must be resolved before canary deploy.
- **dark-light-toggle** — run_a7f3bc91 complete. Self-merged. WCAG AA verified. No pre-production conditions.
- **backbone-external-repo** — run_b3e7f291 complete. 11 files updated. Security reviewed (10 remediations applied). Human review recommended before dogfooding. See decisions.md ADR-003.
- **rag-integration** — run_e4b9f732 complete. 13 files created/edited. NotebookLM per-agent RAG layer. Security reviewed (10 remediations). Human review recommended. Pre-use: approve corpus files, run rag_setup.py. See decisions.md ADR-005.

## [CTO-maintained] Recurring failures

_None recorded yet._

## [CTO-maintained] Tech debt register

- `web/index.html` loads React development builds — must swap to production builds before any deployment.
