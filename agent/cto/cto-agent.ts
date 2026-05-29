import fs from 'node:fs';
import path from 'node:path';
import { Requirement, Plan, CTODecision, RunState, Task, AgentKey } from './shared/types.js';
import { log } from './shared/logger.js';
import { writeState, updateStatus } from './shared/state.js';
import { generate, MODELS } from './shared/gemini.js';

function readMemory(): string {
  const files = ['roadmap.md', 'decisions.md', 'lessons.md', 'skills.md', 'domain.md'];
  return files
    .map(f => {
      const p = path.resolve('memory', f);
      if (!fs.existsSync(p)) return '';
      return `## memory/${f}\n\n${fs.readFileSync(p, 'utf-8')}`;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');
}

function readSystemPrompt(): string {
  const p = path.resolve('.claude/agents/cto.md');
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
  return 'You are the CTO Agent. Orchestrate the IT team to fulfil the requirement.';
}

function buildAgentSet(requirement: Requirement): AgentKey[] {
  const agents: AgentKey[] = ['arc', 'dev', 'qa'];
  if (requirement.touches.some(t => /infra|deploy|k8s|aws|gcp|azure|terraform/.test(t)))
    agents.push('dvo');
  if (requirement.constraints.requireSecuritySignoff ||
      requirement.touches.some(t => /auth|payment|secret|vault|iam/.test(t)))
    agents.push('sec');
  return agents;
}

export async function triage(
  requirement: Requirement,
  state: RunState
): Promise<{ approved: boolean; memo: string; reason?: string }> {
  log('cto', 'triage.start', { input: { title: requirement.title, priority: requirement.priority } });

  const memory = readMemory();
  const systemPrompt = readSystemPrompt();

  const text = await generate({
    model: MODELS.pro,
    maxOutputTokens: 1024,
    jsonMode: true,
    systemInstruction: `${systemPrompt}\n\n## Current memory\n\n${memory}`,
    prompt: `Triage this requirement. Return JSON: {"approved": boolean, "memo": string, "reason": string}

Requirement:
- Title: ${requirement.title}
- Description: ${requirement.description}
- Priority: ${requirement.priority}
- Touches: ${requirement.touches.join(', ') || 'unspecified'}

Check against memory/roadmap.md. Approve only if it aligns with priorities and does not violate constraints.`,
  });
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { approved: true, memo: text };

  log('cto', 'triage.complete', { output: result });
  updateStatus(state.run_id, 'planning');
  return result;
}

export async function decompose(
  requirement: Requirement,
  triageMemo: string,
  state: RunState
): Promise<Plan> {
  log('cto', 'decompose.start', { input: { memo: triageMemo.slice(0, 120) } });

  const agents = buildAgentSet(requirement);
  const memory = readMemory();
  const systemPrompt = readSystemPrompt();

  const text = await generate({
    model: MODELS.pro,
    maxOutputTokens: 8192,
    jsonMode: true,
    systemInstruction: `${systemPrompt}\n\n## Current memory\n\n${memory}`,
    prompt: `Decompose this requirement into a parallel task plan. Return compact JSON (no whitespace in strings):
{"problem":string,"hypothesis":string,"change_sketch":string,"success_metric":string,"rollback_plan":string,"estimated_minutes":number,"task_groups":[[{"agent":string,"goal":string,"context":string,"constraints":string[],"success_criteria":string[],"depends_on":string[]}]]}

Triage memo: ${triageMemo}
Available agents: ${agents.join(', ')}
Requirement touches: ${requirement.touches.join(', ') || 'unspecified'}

Rules:
- Tasks within a group run in parallel. Groups run sequentially.
- Only include agents from the available set.
- Keep all string values under 120 characters. Be concise.`,
  });
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const raw = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  // Assign IDs to every task
  let taskIdx = 0;
  const task_groups: Task[][] = (raw.task_groups || []).map((group: Omit<Task, 'id' | 'run_id' | 'status' | 'assigned_at'>[]) =>
    group.map((t) => ({
      ...t,
      id: `task_${++taskIdx}`,
      run_id: state.run_id,
      status: 'pending' as const,
      assigned_at: new Date().toISOString(),
    }))
  );

  const plan: Plan = {
    run_id: state.run_id,
    requirement_id: requirement.id,
    problem: raw.problem ?? requirement.title,
    hypothesis: raw.hypothesis ?? '',
    change_sketch: raw.change_sketch ?? '',
    success_metric: raw.success_metric ?? '',
    rollback_plan: raw.rollback_plan ?? '',
    estimated_minutes: raw.estimated_minutes ?? 15,
    task_groups,
  };

  state.plan = plan;
  writeState(state);
  log('cto', 'decompose.complete', {
    output: {
      groups: plan.task_groups.length,
      total_tasks: plan.task_groups.flat().length,
    },
  });

  return plan;
}

export async function synthesize(
  state: RunState
): Promise<CTODecision> {
  log('cto', 'synthesize.start');

  const memory = readMemory();
  const systemPrompt = readSystemPrompt();
  const results = state.task_results;
  const blocked = results.filter(r => r.status === 'blocked');

  const text = await generate({
    model: MODELS.pro,
    maxOutputTokens: 1024,
    jsonMode: true,
    systemInstruction: `${systemPrompt}\n\n## Current memory\n\n${memory}`,
    prompt: `All sub-agents have reported. Synthesize and decide. Return JSON:
{"outcome": "approved"|"escalated", "rationale": string, "diff_summary": string, "escalation_reason": string}

Requirement: ${state.requirement.title}
Blocked tasks (${blocked.length}): ${JSON.stringify(blocked.map(r => ({ agent: r.agent, issues: r.issues })))}
Done tasks (${results.length - blocked.length}): ${JSON.stringify(results.filter(r => r.status === 'done').map(r => ({ agent: r.agent, confidence: r.confidence })))}

Approve if all required agents are done and confidence is high. Escalate if anything is blocked or confidence is low.`,
  });
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const raw = jsonMatch ? JSON.parse(jsonMatch[0]) : { outcome: 'escalated', rationale: text };

  const decision: CTODecision = {
    run_id: state.run_id,
    outcome: raw.outcome ?? 'escalated',
    rationale: raw.rationale ?? '',
    diff_summary: raw.diff_summary,
    escalation_reason: raw.escalation_reason,
  };

  state.decision = decision;
  writeState(state);
  log('cto', 'synthesize.complete', { output: decision });
  return decision;
}

export async function updateRoadmap(state: RunState): Promise<void> {
  const roadmapPath = path.resolve('memory/roadmap.md');
  if (!fs.existsSync(roadmapPath)) return;

  log('cto', 'roadmap.update.start');
  const roadmap = fs.readFileSync(roadmapPath, 'utf-8');

  const text = await generate({
    model: MODELS.flash,
    maxOutputTokens: 4096,
    prompt: `Update the CTO-maintained section of this roadmap based on this completed run.

Run: ${state.run_id}
Requirement: ${state.requirement.title}
Outcome: ${state.decision?.outcome}
Rationale: ${state.decision?.rationale}

Current roadmap:
${roadmap}

Return the full updated roadmap markdown. Only modify the "CTO-maintained" section. Never modify "Human-seeded" sections.`,
  });
  const cleaned = stripFences(text);
  if (cleaned && preservesHumanSeeded(roadmap, cleaned)) {
    fs.writeFileSync(roadmapPath, cleaned + '\n');
    log('cto', 'roadmap.update.complete');
  } else {
    log('cto', 'roadmap.update.skipped', {
      reflection: 'Model output dropped a [Human-seeded] section or was empty — keeping original roadmap.',
    });
  }
}

// Remove a leading/trailing markdown code fence the model sometimes wraps the
// file in (```markdown ... ```), which would otherwise be written verbatim.
function stripFences(text: string): string {
  let t = text.trim();
  t = t.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
  return t.trim();
}

// Guard against the model silently deleting human-governed sections. Every
// "[Human-seeded]" heading present in the original must survive in the update.
function preservesHumanSeeded(original: string, updated: string): boolean {
  const markers = original.match(/\[Human-seeded\][^\n]*/g) ?? [];
  return markers.every(m => updated.includes(m));
}
