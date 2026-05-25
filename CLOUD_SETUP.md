# Cloud Setup — make the CTO agent runnable from your phone

This is a **one-time** setup. After it's done, you trigger every CTO run from
the GitHub mobile app: Actions tab → "CTO Run" → "Run workflow" → fill the
form → tap.

## What gets deployed

- `.github/workflows/cto-run.yml` — `workflow_dispatch`-only workflow (no
  cron, no auto-triggers) that runs `tsx agent/cto/index.ts --intake=workflow`
  on Ubuntu, commits any pipeline outputs to a `feat/cto-*` branch, opens a PR
  with you as reviewer, opens a `cto-failed` issue on crash.
- Cost caps: $2/run, $20/day, $50/month (`agent/cto/policy/cost-tracker.ts`).
  Exceeding any cap raises `BudgetExceededError` which fails the run and
  opens the failure issue.
- Feature flag: `CTO_CLOUD_ENABLED` repo variable. If it's not exactly the
  string `true`, the workflow refuses to run (no-op).

## Step 1 — Add 2 required secrets (3 minutes, all on phone)

GitHub mobile app or `github.com` in your browser:

1. Open `packachuz/Agent-Test`
2. **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
3. Add these two secrets:

   | Name | Value |
   |---|---|
   | `GEMINI_API_KEY` | Get from <https://aistudio.google.com/app/apikey> — free tier gives 1500 requests/day on `gemini-2.0-flash`. Click "Create API key", copy. |
   | `ANTHROPIC_API_KEY` | Optional. Only used if you later swap any agent back to Claude. Skip for now; the current code is Gemini-only. |

## Step 2 — Enable the feature flag

Same Settings page → **Variables** tab → **New repository variable**:

| Name | Value |
|---|---|
| `CTO_CLOUD_ENABLED` | `true` |

The exact string `true`. Anything else (including `True`, `1`, `yes`) is
treated as disabled.

## Step 3 — (Optional) Wire NotebookLM RAG

Skip if you don't care about RAG yet. RAG is advisory; the pipeline runs
without it.

To enable:
1. **On a laptop, once:** run `notebooklm login` and `python3 scripts/rag_setup.py`.
   This produces `~/.notebooklm/profiles/default/storage_state.json`.
2. Cat that file, copy its contents.
3. GitHub → Secrets → New: `NOTEBOOKLM_AUTH_JSON` = paste contents.
4. Re-auth roughly quarterly when the session cookie expires.

## Step 4 — Smoke test with a fixture (proves the loop works)

1. GitHub mobile app → `packachuz/Agent-Test` → **Actions** tab
2. Sidebar → **CTO Run**
3. **Run workflow** button (top right of the run list)
4. Fill the form:
   - Branch: `main` (default)
   - title: anything, e.g. `smoke test`
   - description: anything, e.g. `verify cloud loop`
   - priority: `low`
   - **fixture**: `small-bugfix` ← critical, this skips API spend and just exercises the wiring
5. **Run workflow**

Wait ~2 minutes. Then check:
- The workflow run should be **green**
- A new PR titled `cto: smoke test` (or similar) should open, with you as
  reviewer, on a `feat/cto-*` branch
- The PR diff should contain new `runs/<run_id>.jsonl` + updates to
  `memory/decisions.md` and/or `memory/roadmap.md`

If green and the PR looks right, the loop works.

## Step 5 — Trigger a real run

Same workflow, but leave the `fixture` field empty and write a real
requirement in the `title` and `description` fields. The pipeline will
spend tokens this time; cost caps protect against runaway.

## Rollback

Three levels, from softest to nuclear:

1. **Pause the loop**: Settings → Variables → set `CTO_CLOUD_ENABLED` to
   `false` (or delete the variable). All future `workflow_dispatch` runs
   no-op.
2. **Stop a stuck run**: Actions tab → the running workflow → **Cancel
   workflow** (top right).
3. **Revert this commit**: `git revert <commit>` of the merge that landed
   the workflow. The workflow file goes away.

## What this Phase 1 does NOT do (yet)

- **No actual code editing by the agent.** Sub-agents emit text plans and
  decisions; the PR contains those artifacts (run log, ADR, roadmap update).
  Real implementation work is still on a human (or a future Phase 2 that
  adds a file-diff applier).
- **No cron / scheduled runs.** Locked to manual triggers per grill-me Q2.
- **No issue-label triggers.** Same reason.
- **No `npm run iterate` from the cloud.** The pipeline is invoked via the
  workflow YAML directly.

See `memory/decisions.md` ADR-014 for the locked design decisions and the
trade-offs we accepted.
