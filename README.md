# Agent-Test

Autonomous multi-agent IT team with a CTO orchestrator. Submit a requirement; the system triages, plans, and executes it across specialist agents — Architect, Security, Developer, QA, and DevOps — then decides whether to self-merge or escalate to a human.

## Architecture

```
/cto-iterate <requirement>
      │
      ├── Triage  (CTO reads roadmap + domain)
      │
      ├── Group 0 — DevOps: repo-setup        ← only when target_repo provided
      │
      ├── Group 1 — Architect + Security       (parallel)
      │
      ├── Group 2 — Developer
      │
      └── Group 3 — QA + DevOps: pr-open      (parallel)
```

Each agent is a Claude sub-agent with a scoped system prompt from `.claude/agents/<name>.md`. All inter-agent communication is through structured task results written to `runs/<run_id>.jsonl`.

## Key Features

- **CTO orchestrator** — triages requirements against `memory/roadmap.md` and `memory/domain.md`; discards, escalates, or approves
- **Autonomy check** — self-merges when ≤5 files, ≤200 lines added, no frozen paths, no new deps, CI green; otherwise escalates with a precise reason
- **External repo provisioning** — DevOps can create or clone a target GitHub repo, branch, implement in that workspace, and open a PR at the end
- **RAG memory** — five per-agent NotebookLM notebooks (arc/sec/dev/qa/dvo) queried before each agent dispatch; run outcomes synced back after each run
- **Frozen surfaces** — `agent/`, `.claude/`, `.github/` require human approval; enforced via `.claude/settings.json` deny list
- **Web dashboard** — React SPA at `web/` showing run history, outcomes, and PR links

## Project Structure

```
.claude/
  agents/        # system prompts for each agent
  commands/      # /cto-iterate slash command
  settings.json  # allow/deny permission rules
agent/cto/       # TypeScript CTO runtime (intake, types, orchestration)
memory/          # append-only ADR log, roadmap, domain context, lessons
rag/             # RAG config, corpus sources, notebook ID registry
runs/            # JSONL log per run
scripts/         # rag_setup.py, rag_sync.py, rag_query.py, rag_rebuild.py
web/             # dashboard SPA
```

## Quick Start

**Run a requirement through the pipeline:**
```bash
/cto-iterate <describe the requirement>
```

**Set up RAG notebooks** (once per environment, requires NotebookLM auth):
```bash
notebooklm login
python3 scripts/rag_setup.py
```

**Run tests:**
```bash
python3 scripts/test_rag.py
npm run typecheck
```

**Web dashboard:**
```bash
python3 -m http.server 3000 --directory web
# open http://localhost:3000
```

## Memory & Decisions

All architectural decisions are recorded in `memory/decisions.md` as ADRs. The CTO appends after each run. Human-seeded sections in `memory/roadmap.md` and `memory/domain.md` are never overwritten by agents.

## Security Notes

- Agent permissions are enforced via `.claude/settings.json` — `git push` is scoped to `feat/*` branches; `python3 -c` and `python3 -` are denied
- RAG uploads only sanitized corpus summaries (`rag/corpus/`) — never raw memory files
- NotebookLM auth is written to tmpfs (`/dev/shm/`) at mode 0600 and deleted after each script run
- `scripts/rag_rebuild.py` is operator-only and in the deny list
