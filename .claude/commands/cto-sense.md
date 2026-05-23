# /cto-sense

Read the current system state and report what the CTO Agent sees before acting.
Use this to debug or understand the current context before running /cto-iterate.

## Steps

1. Read `memory/roadmap.md` — summarise active initiatives and quarterly objectives in 3–5 bullets
2. Read `memory/lessons.md` — list the top 3 most recent failure patterns
3. Read `memory/decisions.md` — show the last 3 ADR entries
4. Read `state/current.json` — if a run is in progress, show its status and which agents are active
5. List files in `runs/` — show the 5 most recent run IDs and their outcomes (parse the last line of each JSONL)

Print a concise dashboard:

```
── CTO Sense ──────────────────────────────
Active run:   <run_id or "none">
Queue:        <pending requirements or "empty">

Roadmap (top priorities):
  • ...

Recent lessons:
  • ...

Last 5 runs:
  run_xxx  approved   11m 02s
  run_yyy  escalated  23m 41s
  ...
───────────────────────────────────────────
```
