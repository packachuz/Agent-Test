# Agent IT Team — Backend

Autonomous multi-agent IT system. One CTO Agent orchestrates five specialists (Architect, Developer, QA, DevOps, Security) to triage, implement, verify, and deploy IT requirements end-to-end.

## Quick start

```bash
# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Install dependencies
npm install

# Run one iteration (interactive CLI intake)
npm run cli

# Dry-run with a fixture (no API calls to sub-agents)
npx tsx agent/cto/index.ts --fixture=small-bugfix --dry-run
npx tsx agent/cto/index.ts --fixture=high-severity-bug --dry-run

# Run the overnight retrospective
npm run retro
```

## How one requirement flows

```
1. Intake        →  CLI prompt / GitHub Issue / Webhook
2. Triage        →  CTO checks roadmap.md — approve, discard, or escalate
3. Decompose     →  CTO builds parallel task groups
4. Execute       →  Sub-agents run; groups sequential, tasks within group parallel
5. Synthesize    →  CTO reviews all results, decides approve or escalate
6. Autonomy gate →  evaluateAutonomy() — self-merge if safe, else PR + human review
7. Roadmap update→  CTO writes outcomes back to memory/roadmap.md
8. Log           →  Full trace written to runs/<run_id>.jsonl
```

## Intake methods

| Method | How to trigger |
|--------|---------------|
| CLI | `npm run cli` — interactive prompt |
| GitHub Issue | Label any issue with `agent-team` — Actions workflow fires |
| Workflow dispatch | GitHub Actions → Run workflow → fill in title + description |

## Loop driver

Two GitHub Actions workflows:
- **`agent-team.yml`** — triggered by `workflow_dispatch` or `issues: labeled` — runs one full CTO pipeline iteration
- **`overnight-retro.yml`** — runs at 02:00 UTC daily — reads recent run logs and updates `memory/lessons.md`, `memory/skills.md`, `memory/roadmap.md`

## Memory files

| File | Who writes | Purpose |
|------|-----------|---------|
| `memory/roadmap.md` | Humans (seeded) + CTO (maintained) | Priorities, compliance, frozen surfaces |
| `memory/domain.md` | Humans only | Tech stack, security policies, service quirks |
| `memory/decisions.md` | CTO (append-only) | ADR log |
| `memory/lessons.md` | CTO + Security + Retrospect | Failure patterns |
| `memory/skills.md` | Retrospect | Improved approaches |

## Autonomy boundary

The CTO self-merges only when **all** hold:
- ≤ 5 files changed, ≤ 200 lines added
- No frozen paths (`infra/`, `auth/`, `payments/`, `.github/`, `agent/`, etc.)
- No new dependencies, no major version bumps
- CI green, tests added or updated
- Change class: bugfix, copy edit, dead code, patch bump, or perf tweak

Anything else → PR opened, labeled `needs-human-review`, tracking issue created.

## Required secret

Set `ANTHROPIC_API_KEY` in your GitHub repo secrets for Actions workflows to call the Claude API.
