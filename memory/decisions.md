# Decisions

Append-only ADR log. CTO appends after each run. Never overwrite or delete entries.

---

## ADR-005 · run_e4b9f732 · 2026-05-23 · APPROVED — human review recommended

**Requirement**: Add NotebookLM RAG integration — per-agent learning (Phase 1 + Phase 2)
**Outcome**: Approved — 13 files, new external dep (notebooklm-py). Human review recommended before dogfooding.

**Decision: Advisory RAG layer via Google NotebookLM — pipeline never blocks on failure**
Five per-agent notebooks (arc, sec, dev, qa, dvo). Queries run before each agent dispatch; sync runs after JSONL log. Exit code 2 on advisory failure (pipeline continues). All agents receive RAG context wrapped in `<rag_context trust="untrusted">` delimiter.

**Security review**: BLOCKED with 10 remediations (R1–R10). All incorporated before Developer run.
- R1 (P0): Only sanitized `rag/corpus/` files uploaded — never raw memory files
- R2 (P0): Run JSONL filtered to allowlist (run_id, timestamp, agent_name, verdict) before upload
- R3 (P0): RAG answers wrapped in untrusted-content delimiter in cto-iterate.md
- R4 (HIGH): NOTEBOOKLM_AUTH_JSON written to /dev/shm/<pid>.json (0600), env var cleared
- R5 (HIGH): rag_query.py exits 2 on advisory failure, 0 on success
- R6 (HIGH): run_id validated against ^run_[a-zA-Z0-9]{8}$ before any file path use
- R7 (MEDIUM): Max 50 synced runs per notebook; deduplication via rag/synced_runs.json
- R8 (MEDIUM): Query strings sanitized (email, Vault paths, .internal hostnames stripped)
- R9 (LOW): Bash(python3 scripts/rag_rebuild.py) added to deny list
- R10 (MEDIUM): notebooklm-py==0.5.0 pinned in requirements.txt

**QA verdict**: PASS (88/100). 10/10 unit tests. Two non-blocking minor findings:
- JSONL_ALLOWLIST constant in rag_sync.py is dead code (security maintained inline)
- decision/outcome field regex preserves hyphens (only exploitable with runs/ write access)

**Pre-use checklist:**
- [ ] Human reviews and approves corpus files (rag/corpus/lessons-summary.md, decisions-summary.md)
- [ ] Run `notebooklm login` on target machine (or inject NOTEBOOKLM_AUTH_JSON from Vault)
- [ ] Run `python3 scripts/rag_setup.py` to create notebooks
- [ ] Verify `rag/notebooks.json` created and gitignored

---

## ADR-006 · run_e4b9f732 · 2026-05-23

**Decision: Auth via tmpfs file (/dev/shm) with env var cleared immediately**
Write NOTEBOOKLM_AUTH_JSON to /dev/shm/notebooklm_<pid>.json with mode 0600. Clear env var before spawning any child. Delete file in finally block. Falls back to ~/.notebooklm/ for local dev without env var.
Rejected: passing auth directly as env var (violates domain.md Vault-only policy; readable via /proc/<pid>/environ).

---

## ADR-007 · run_e4b9f732 · 2026-05-23

**Decision: rag/notebooks.json and rag/synced_runs.json gitignored**
Notebook IDs are per-Google-account. synced_runs.json is per-environment run-tracking state. Neither belongs in git. rag_setup.py creates both; rag_rebuild.py resets both. Run rag_setup.py once per environment.

---

## ADR-004 · run_c4d8e512 · 2026-05-23 · ESCALATED — awaiting human approval

**Requirement**: Extend TypeScript types + CLI intake with target_repo + workspace_path
**Outcome**: Escalated — frozen surface (`agent/`). Diffs ready; human must approve merge.

**Decision: inline optional fields on Requirement (Alt A)**
Add `target_repo?: { type, org, name, url? }` and `workspace_path?: string` to `Requirement` interface. Additive-only, backwards-compatible. `rl.close()` moved after new prompts in cli.ts (bug fix: was closing readline before target_repo prompts ran).

**Diffs (apply after human approval):**
- `agent/cto/shared/types.ts`: +8 lines (two optional fields after `received_at`)
- `agent/cto/intake/cli.ts`: +46 lines (target_repo prompt, validation, URL parser)

**Frozen surface conditions:**
- [ ] Human approves both diffs
- [ ] TypeScript compiles (`tsc --noEmit`) after patch
- [ ] Manual smoke-test of all three input paths (new / existing-url / skip)

---

## ADR-003 · run_b3e7f291 · 2026-05-23

**Requirement**: Add external repo provisioning support to CTO backbone (priority: high)
**Outcome**: Approved — human review recommended (11 files, exceeds self-merge threshold)

**Decision: DevOps modal extension (repo-setup + pr-open) over new agent**
Two new named modes added to `devops.md` bracket every cross-repo run. Group 0 provisions the repo; Group 3 opens the PR. `workspace/<org>/<name>/` holds ephemeral clones (gitignored). All agents gain `## External workspace` sections for workspace-path-aware operation.

**Security remediations applied (10 total):**
- R1: `git push *` → scoped to `git push origin feat/*`; refspec force-push blocked
- R2: GITHUB_TOKEN must come from Vault, never env vars
- R3: `gh repo clone` uses `--config core.hooksPath=/dev/null`
- R4: `git add -A` replaced with explicit Developer file list
- R5: `find -P` + realpath guard for symlink escape prevention
- R6: PR body uses structured allowlist, not raw agent output
- R7: PR URLs validated to `https://github.com/` prefix + `rel="noopener noreferrer"`
- R8: `memory/projects.md` append-only note added
- R9: Org/repo_name input validation in cto-iterate intake
- R10: `python3` scoped to `scripts/`; `python3 -c *` denied

**New files**: `memory/projects.md` (project registry), `workspace/` (.gitignored)

---

## ADR-002 · run_a7f3bc91 · 2026-05-23

**Requirement:** Add dark/light mode toggle to the dashboard (priority: medium)
**Outcome:** Approved — self-merged

**Decision: `data-theme` attribute on `<html>` + `useTheme` hook in `Header`**
Theme state is managed by a self-contained `useTheme` hook called inside `Header`. The DOM attribute `[data-theme="light"]` on `<html>` overrides all CSS custom properties. No React Context, no prop drilling, no new packages. `localStorage` key `theme` persists the preference across reloads with try/catch fallback for private-browsing.

**Rejected alternatives:**
- `prefers-color-scheme` media query only — no user-controlled toggle; fails SC2/SC3
- Theme state hoisted to `App`/`AppShell` via props — requires edits to `app.jsx`; unnecessary prop drilling given that the DOM attribute is itself the global state

**QA notes:**
- `--fg-faint` in light mode required contrast correction: raised lightness from 0.58 to 0.46 (oklch) to meet WCAG AA ≥4.5:1 across all background pairings
- Security: APPROVED unconditionally. No PII, no auth surface, no supply chain risk.

---

## ADR-001 · run_a1b2c3d4 · 2026-05-23

**Requirement:** Add user login page (priority: low)
**Outcome:** Approved

**Decision: OIDC authorization-code flow — no password field on frontend**
The login page collects only email as `login_hint` and redirects to the IDP. No credentials are handled or stored by the frontend. All token exchange is done server-side by the existing `auth/` backend.

**Rejected alternatives:**
- ROPC grant (password in browser memory, deprecated in OAuth 2.0 Security BCP)
- BFF session cookie approach (requires `auth/` backend changes — frozen surface)

**Pre-production checklist (Security conditions):**
- [ ] Implement `Referrer-Policy: no-referrer` on login page response
- [ ] Switch CDN scripts from `react.development.js` to `react.production.min.js`
- [ ] Define Content-Security-Policy header for auth pages
- [ ] Confirm IDP enforces strict `redirect_uri` allowlist matching
- [ ] Confirm `/api/auth/me` returns minimal claims only

---

## ADR-008 · 2026-05-23 · APPROVED — human approved (frozen surface)

**Requirement**: ADR-004 — Extend `Requirement` type with `target_repo` and `workspace_path` for external repo provisioning
**Outcome**: Approved. Human sign-off received. `tsc --noEmit` passes.

**Changes applied**:
- `agent/cto/shared/types.ts`: new `TargetRepo` interface; `Requirement` extended with `target_repo?: TargetRepo` and `workspace_path?: string`
- `agent/cto/intake/cli.ts`: added fifth prompt "Target repo [new / existing / skip]"; parses `org`/`name` from GitHub URL for `existing`; sets `target_repo` on returned `Requirement`

**Rationale**: These types are the contract between intake and the cto-iterate pipeline. Keeping them in the frozen `agent/` surface ensures only human-approved changes modify the intake shape.

---

## ADR-009 · 2026-05-24 · APPROVED — self-merge equivalent

**Requirement**: run_7d2f9e3a — Wire dashboard SPA to real backend APIs

**Outcome**: Approved. Build green; smoke tests of `/api/auth/me` and `/api/runs` return expected shapes. Pushed to `main`; Vercel auto-deploy follows.

**Changes applied**:
- `site/app/api/auth/me/route.ts`: new — dev-only stub returning `{ user: { email, name } }` so the SPA's auth gate opens. **Not production-grade.**
- `site/app/api/runs/route.ts`: new — reads `data/runs/*.jsonl` (copied at build time from `../runs/`), aggregates per-run summaries, sorts by `received_at` desc.
- `site/package.json`: extended `prebuild` script to also copy `../runs/*.jsonl` → `site/data/runs/`.
- `site/next.config.ts`: added `outputFileTracingIncludes` so Vercel bundles the run files into the `/api/runs` serverless function.
- `site/.gitignore`: ignore `data/` (generated at build).
- `web/js/pages/dashboard.jsx`: `RecentRunsTable` now fetches `/api/runs` with `useState`+`useEffect`; renders loading/error/empty states + real rows.

**Rationale**: User asked the CTO team to "make the dashboard real". This run covers Layer 1 (unlock the SPA) + the first slice of Layer 2 (real Recent Runs table). Memory/Agents pages and the run-detail page remain mock; deferred to a follow-up run.

**Open items (must address before production)**:
- [ ] Replace `/api/auth/me` stub with real OIDC flow (per ADR-001 commitments). Track as run TBD.
- [ ] Add `/api/runs/[id]` for the run-detail page.
- [ ] Add `/api/memory` (decisions/lessons/roadmap) and `/api/agents`.
- [ ] Apply remaining ADR-001 hardening (Referrer-Policy, CSP, production React build) to `site/` deployment.
- [ ] Vercel filesystem is read-only at runtime — write-side endpoints (submit new requirement) need an external store or commit-and-push.

**Autonomy check**: 6 files / ~165 lines added / no frozen paths / no new deps. 1 file over the ≤5 budget; bulk of change is in 2 files (runs route + dashboard.jsx). Acceptable per user-approved override.

---

## ADR-010 · 2026-05-24 · APPROVED — self-merge equivalent

**Requirement**: run_f4c8b2e1 — Wire Run Detail page to `/api/runs/[id]`

**Outcome**: Approved. Build green; endpoint smoke-tested (valid id → 200 with full summary+events; invalid id → 400 from regex guard).

**Changes applied**:
- `site/app/api/runs/[id]/route.ts`: new — validates `id` against `/^run_[A-Za-z0-9]+$/` (blocks path traversal), reads `data/runs/<id>.jsonl`, returns `{summary, events}`.
- `site/next.config.ts`: extended `outputFileTracingIncludes` to cover `/api/runs/[id]`.
- `web/js/app.jsx`: `nav` now accepts `(page, params)`; pageParams stored in state and passed as `runId` prop to `RunDetailPage`.
- `web/js/pages/dashboard.jsx`: `onNav('run-detail', { runId: r.id })` on row click.
- `web/js/pages/run-detail.jsx`: replaced the 180-line mocked page with a fetch-driven version. Renders real title, requirement description, decision/outcome, files-changed list, and the full event timeline read from JSONL. Removed the mocked Timeline/SLA/cost cards since they showed fake data.

**Rationale**: Continuation of ADR-009. Row click → real detail page completes the dashboard's read path. Mock removal is honest: the SLA/cost cards were lying about data we don't have.

**Open items (next runs)**:
- [ ] `/api/agents` + Agents page wired up
- [ ] `/api/memory` + Memory page (decisions/lessons/roadmap rendered)
- [ ] `/api/runs` accepts `?limit=`
- [ ] Replace `/api/auth/me` stub with real OIDC (ADR-001 still outstanding)
- [ ] Agent-glyph color map in run-detail is hardcoded to known agent keys; needs a fallback when unknown agents appear

**Autonomy check**: 5 files / net **-74 lines** on `run-detail.jsx` (replacement deletes more mock than the new fetch logic adds) + ~110 new lines in the route + small edits elsewhere = ~150 lines net. Under budget. No frozen paths. No new deps.
