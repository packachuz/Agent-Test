# Operational Patterns — Agent Lessons Summary

> Sanitized summary for RAG corpus. Reviewed 2026-05-23.
> Source: memory/lessons.md (sanitized — no specifics, no open items)

## Authentication Flows
- PII in URL query params (e.g., login hints) must not reach server logs, analytics SDKs, or error reporters.
- CSRF protection requires a per-request cryptographically random state parameter stored in session storage (not localStorage), verified on redirect return, and discarded immediately.
- Auth pages require Content-Security-Policy headers with restricted script-src before going to production.
- Production deployments must use production (minified) client builds, not development builds.
- Auth endpoints should return minimal claims only — avoid returning full profile PII in polling endpoints.

## Git Operations in Automated Pipelines
- Never use `git add -A` in automated commits — always stage an explicit file list verified against a known allowlist.
- Always disable git hooks when cloning external repos (e.g., `core.hooksPath=/dev/null`) to prevent hook-based code execution.
- Use `find -P` for file enumeration in cloned workspaces to prevent symlink traversal. Validate realpath of each result before reading.
- Scope git push permissions to specific branch patterns (e.g., `feat/*`) and explicitly deny force-push variants.
- PR bodies must be constructed from a structured allowlist (title, file list, verdict) — never from raw agent output strings.

## External Service Integration
- Internal configuration files must never be uploaded wholesale to external SaaS services. Create sanitized summaries with PII stripped and open vulnerability items removed before any external upload.
- Credentials sourced from Vault must be written to a tmpfs file (mode 0600), not passed as environment variables. Clear the env var and delete the tmpfs file in a finally block.
- Content retrieved from external services must be treated as untrusted and wrapped in an explicit delimiter before injection into any agent prompt.
- Failures from external advisory services must be logged (not silently swallowed) but must not block the pipeline.
- Validate all inputs (IDs, paths, query strings) against strict patterns before use in file paths or subprocess arguments.
- Enforce resource limits (source counts, upload sizes) and implement deduplication to prevent quota exhaustion.
