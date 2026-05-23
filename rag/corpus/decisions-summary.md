# Architecture Decision Register — Summary for RAG Corpus

> Sanitized outcome summary for RAG corpus. Reviewed 2026-05-23.
> Source: memory/decisions.md (sanitized — verdicts only, no pending items, no remediation details)

## ADR-001 — Login Page (2026-05-23)
Outcome: Approved. Decision: OIDC authorization-code flow. Email collected as login_hint only; no credentials on frontend. All token exchange server-side.
Rejected: ROPC grant (credentials in browser memory); BFF session cookie approach (frozen surface).

## ADR-002 — Dark/Light Mode Toggle (2026-05-23)
Outcome: Approved, self-merged. Decision: data-theme attribute on html element + useTheme hook in Header component. No Context/prop-drilling. localStorage persistence with try/catch fallback.
Rejected: media-query-only approach (no user control); theme state hoisted to App (unnecessary prop drilling).

## ADR-003 — External Repo Provisioning (2026-05-23)
Outcome: Approved. Human review recommended (11 files). Decision: DevOps modal extension (repo-setup + pr-open modes). workspace/ directory for ephemeral clones (gitignored). Developer writes files; DevOps handles all git operations.
Key patterns: disable git hooks on clone; explicit file staging; scoped push permissions; structured PR body; Vault-only tokens.

## ADR-004 — TypeScript Types Extension (2026-05-23)
Outcome: Escalated — awaiting human approval (frozen surface: agent/). Decision design complete: inline optional fields on Requirement interface. No merge until human approves.

## ADR-005 — RAG Advisory-Only Design (run_e4b9f732, 2026-05-23)
Outcome: Approved. Decision: RAG is advisory — pipeline never blocks on NotebookLM failure. Scripts exit code 2 on error; pipeline logs warning and continues.

## ADR-006 — RAG Auth via tmpfs (run_e4b9f732, 2026-05-23)
Outcome: Approved. Decision: NOTEBOOKLM_AUTH_JSON written to /dev/shm/<pid>.json (mode 0600), env var cleared, file deleted in finally block. Fallback to ~/.notebooklm/ for local dev.

## ADR-007 — RAG notebooks.json gitignored (run_e4b9f732, 2026-05-23)
Outcome: Approved. Decision: rag/notebooks.json is environment-specific (per-Google-account) and must not be committed. Run rag_setup.py once per environment.
