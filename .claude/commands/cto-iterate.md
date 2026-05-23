# /cto-iterate

Run one full CTO Agent pipeline iteration on a new IT requirement.

## Steps

### 1. Intake
Ask the user for:
- **Title** — one-line summary of the requirement
- **Description** — what needs to be done and why
- **Priority** — low / medium / high (default: medium)
- **Touches** — which services or file paths are in scope (optional)

Assign a run ID: `run_<8 random chars>`. Record `received_at` as current timestamp.

### 2. Triage
Read `memory/roadmap.md` and `memory/domain.md`.

Decide:
- **Discard** — if the requirement contradicts quarterly objectives or frozen surfaces. Tell the user why and stop.
- **Escalate** — if the requirement is novel, high-stakes, or touches compliance boundaries. Ask the user to confirm before proceeding.
- **Approve** — rewrite the requirement into a triage memo (problem, risk level, agent set needed).

### 3. Decompose
Based on the triage memo, build a task plan:
- Assign tasks to: Architect, Developer, QA, and optionally DevOps and/or Security
- Group tasks: tasks within a group run in parallel, groups run sequentially
- Typical flow: Group 1 = [Architect + Security in parallel] → Group 2 = [Developer] → Group 3 = [QA + DevOps in parallel]

### 4. Execute — spawn sub-agents in parallel per group
For each group, use the Agent tool to spawn each sub-agent simultaneously.
Pass each agent:
- Its system prompt from `.claude/agents/<name>.md`
- The triage memo as context
- Its specific task goal and success criteria
- Relevant memory files (lessons.md for all; domain.md for Security)

Wait for all agents in the group to report DONE or BLOCKED before moving to the next group.

If any agent reports BLOCKED:
- Ask the user whether to retry, adjust the plan, or abandon
- Do not proceed to the next group automatically

### 5. Synthesize
Review all agent outputs. Decide:
- **Approve** — all required agents are DONE, confidence is high
- **Escalate** — any agent BLOCKED, or confidence is low

Apply the autonomy check:
- Self-merge eligible: ≤5 files, ≤200 lines added, no frozen paths, no new deps, CI green, tests updated
- Otherwise: tell the user exactly what needs human review and why

### 6. Update memory
- Append the run outcome to `memory/decisions.md`
- Update the CTO-maintained section of `memory/roadmap.md` (never touch human-seeded sections)
- If Security or QA found new failure patterns, append to `memory/lessons.md`

### 7. Log
Write a JSONL log entry to `runs/<run_id>.jsonl` containing:
- run_id, requirement, plan, agent results, decision, timestamps

### 8. Report to user
Print a concise summary:
- Run ID
- Outcome (approved / escalated / discarded)
- Which agents ran and their verdicts
- What was written to memory
- Next steps (if escalated: what the human needs to review)
