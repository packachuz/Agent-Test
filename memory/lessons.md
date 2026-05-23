# Lessons

Failure patterns the agents have learned. CTO and Security append; all agents read.

---

## Login Page / OIDC Authorization-Code Flow (security review 2026-05-23)

**Pattern: login_hint handling must not leak into logs or analytics.**
The user-supplied email is PII. It flows as a URL query parameter (`login_hint`) in the redirect to the IDP. Ensure no server-side request logging, client-side analytics, or error-reporting SDKs (Sentry, Datadog RUM, etc.) capture the full redirect URL before the IDP strips the hint.

**Pattern: OIDC `state` parameter is mandatory for CSRF protection.**
A cryptographically random `state` value must be generated per authorization request, stored in session storage (NOT localStorage), compared on redirect return, and discarded immediately. Omitting or reusing `state` opens the flow to CSRF / login-CSRF.

**Pattern: Content-Security-Policy must be set before any auth page ships.**
The current frontend serves inline Babel transpilation and React from unpkg CDN. Auth pages carry higher risk; a CSP with `script-src` restricted to known hashes/nonces is required before the login page goes to production.

**Pattern: React development builds must not reach production.**
`index.html` currently loads `react.development.js` and `react-dom.development.js` from unpkg. Development builds include verbose warnings and debugging hooks that increase attack surface. Production builds (`react.production.min.js`) must be used for any deployed environment.

**Pattern: `login_hint` is advisory — IDP must not blindly trust it for account selection.**
The frontend passes email as a hint; the IDP must still require full authentication. Document that the IDP configuration enforces this to prevent account enumeration shortcuts.

**Pattern: `GET /api/auth/me` response must not include fields beyond what the UI needs.**
The auth-state endpoint should return minimal claims (e.g., display name, role). Full profile PII should not be returned in a polling endpoint that may be captured by browser devtools/network logs.

---

## External Repo Provisioning / DevOps Git Operations (security review 2026-05-23)

**Pattern: `git add -A` in automated pipelines risks staging secrets.**
Never use `git add -A` in agent-driven commits. The Developer agent may write `.env`, `*.key`, or test fixture secrets to the workspace. Always stage an explicit list of files from the Developer's DONE report. Verify no secret-pattern filenames are staged before committing.

**Pattern: `gh repo clone` executes post-checkout hooks — always disable them.**
A malicious or compromised repo can include `.git/hooks/post-checkout` that executes arbitrary code at clone time. Always pass `-- --config core.hooksPath=/dev/null` to `gh repo clone`. For greenfield repos created with `gh repo create --clone`, immediately run `git -C <path> config core.hooksPath /dev/null`.

**Pattern: `find` without `-P` flag can traverse symlinks outside workspace.**
When Architect or QA agents enumerate files in a cloned workspace using `find`, they must use `find -P` to prevent symlink following. Before reading any file path returned by find, verify its `realpath` starts with `workspace_path`. A crafted repo with symlinks can otherwise expose host filesystem files to the agent.

**Pattern: Broad `git push *` permission allows force-push via refspec bypass.**
A `settings.json` allow rule like `Bash(git push *)` is bypassable via `git push origin +main:main` (refspec force) or `--force-with-lease`. Scope push permissions to specific branch patterns (e.g., `feat/*`) and explicitly deny `git push origin +*` in the deny list.

**Pattern: PR bodies sourced from raw agent output risk leaking internal infrastructure.**
Agent outputs routinely contain Vault path names, internal service hostnames, error traces, token counts, and memory file contents. PR bodies must be constructed from a structured allowlist (title, changed file list, QA verdict) — never from raw `run_summary` or agent output strings.

---

## External RAG / NotebookLM Integration (security review 2026-05-23)

**Pattern: Sending internal memory files to an external cloud service is a P0 data-exfiltration risk.**
`memory/domain.md` contains live security policy, escalation contacts (PagerDuty, internal email addresses), JWKS rotation schedules, and known-vulnerable service names. `memory/lessons.md` contains remediation gaps (open checkboxes) and internal architecture details. `memory/decisions.md` contains ADR state, frozen surfaces, and pending human-approval items. These files must never be uploaded wholesale to an external SaaS. A content-classification gate (strip contact info, pending items, and policy internals) is mandatory before any external upload.

**Pattern: Run JSONL outputs are a high-sensitivity exfiltration target.**
`runs/<run_id>.jsonl` contains agent summaries, Vault path references, internal service hostnames, security finding details, file paths, and PR URLs. Syncing run outputs to an external service violates SOC2 CC6.1 (audit-log confidentiality) and may expose active vulnerability details. Run outputs must be sanitized through an explicit allowlist (verdict, run_id, timestamp, agent names only) before any external sync.

**Pattern: NotebookLM answers injected into agent prompts are an unauthenticated prompt-injection vector.**
Retrieved context from an external service is attacker-controlled if the service is compromised, the notebook is misconfigured, or query strings are manipulated. All RAG answers must be wrapped in a clearly delimited, untrusted-content block and agents must be instructed to treat retrieved context as informational only — never as instructions. Absence of this boundary allows a compromised or poisoned notebook to hijack agent behavior.

**Pattern: Google OAuth credentials in env vars violate the project's Vault-only secrets policy.**
`NOTEBOOKLM_AUTH_JSON` is a Google OAuth session token. Even when sourced from Vault at startup, storing it as a process-environment variable exposes it to any subprocess, `/proc/<pid>/environ` readers, and crash dumps. Credentials must be written to a tmpfs file with mode 0600, consumed by the client, and the env var must be unset before spawning any child processes.

**Pattern: Silent failure in RAG query fallback masks injection and availability attacks.**
`rag_query.py` returning `{answer:"", citations:[]}` on any error means a compromised endpoint, a poisoned notebook, or a network MITM returns an empty string that agents silently accept. Failures must be surfaced as BLOCKED status so the pipeline halts rather than proceeding without grounding context.

**Pattern: `python3 scripts/rag_sync.py --run_id=<id>` passes unsanitized run IDs as shell arguments.**
If run IDs are ever derived from external input (e.g., a GitHub webhook payload), a crafted `run_id` value can cause path traversal (`../../etc/passwd`) or argument injection. Run IDs must be validated against `^run_[a-zA-Z0-9]{8}$` before use in any file path or subprocess argument.

**Pattern: Unlimited source upload to NotebookLM enables denial-of-service and cost exhaustion.**
`rag_sync.py` adds every run output as a new source without a cap. A high-frequency pipeline can exhaust Google API quotas, trigger rate-limiting failures that cascade into pipeline stalls, or incur unbounded cost. A maximum source count per notebook and a deduplication check (by run_id) must be enforced before upload.
