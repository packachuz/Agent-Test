import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { Task, TaskResult } from '../shared/types.js';
import { log } from '../shared/logger.js';

const client = new Anthropic();
const MAX_RETRIES = 3;

function systemPrompt(): string {
  const p = path.resolve('.claude/agents/architect.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : 'You are the Architect Agent. Design implementation plans.';
}

function memory(): string {
  return ['lessons.md', 'decisions.md', 'domain.md']
    .map(f => { const p = path.resolve('memory', f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : ''; })
    .filter(Boolean).join('\n---\n');
}

export async function runArchitect(task: Task): Promise<TaskResult> {
  let retries = 0;
  let lastError = '';

  while (retries < MAX_RETRIES) {
    try {
      log('arc', 'plan.draft', { input: { goal: task.goal }, retry: retries > 0, retry_count: retries });

      const response = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 4096,
        system: [
          { type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } },
          { type: 'text', text: `## Memory\n\n${memory()}`, cache_control: { type: 'ephemeral' } },
        ],
        messages: [{
          role: 'user',
          content: `Goal: ${task.goal}
Context: ${task.context}
Constraints: ${task.constraints.join('; ')}
Success criteria: ${task.success_criteria.join('; ')}

Produce a detailed implementation plan with:
1. Chosen approach (and 1-2 alternatives considered + why rejected)
2. Milestones (ordered steps)
3. ADR entries for each significant decision
4. Risks and mitigations
5. Files the Developer will need to touch

${retries > 0 ? `Previous attempt failed: ${lastError}\nTry a different approach.` : ''}`,
        }],
      });

      const output = response.content[0].type === 'text' ? response.content[0].text : '';

      const meetsAllCriteria = task.success_criteria.every(c =>
        output.toLowerCase().includes(c.toLowerCase().split(' ')[0])
      );

      if (!meetsAllCriteria && retries < MAX_RETRIES - 1) {
        lastError = 'Plan did not address all success criteria';
        retries++;
        log('arc', 'plan.reflect', { reflection: lastError, retry: true, retry_count: retries });
        continue;
      }

      log('arc', 'plan.done', { output: output.slice(0, 200) });
      return {
        task_id: task.id,
        agent: 'arc',
        status: 'done',
        output,
        retries,
        issues: [],
        confidence: meetsAllCriteria ? 0.9 : 0.6,
        completed_at: new Date().toISOString(),
      };

    } catch (e) {
      lastError = String(e);
      retries++;
      log('arc', 'plan.error', { error: lastError, retry: true, retry_count: retries });
    }
  }

  return {
    task_id: task.id,
    agent: 'arc',
    status: 'blocked',
    output: '',
    retries,
    issues: [`Failed after ${MAX_RETRIES} attempts: ${lastError}`],
    confidence: 0,
    completed_at: new Date().toISOString(),
  };
}
