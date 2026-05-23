import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { Task, TaskResult } from '../shared/types.js';
import { log } from '../shared/logger.js';

const client = new Anthropic();
const MAX_RETRIES = 2;

function systemPrompt(): string {
  const p = path.resolve('.claude/agents/devops.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : 'You are the DevOps Agent. Handle deployment and infrastructure.';
}

export async function runDevOps(task: Task): Promise<TaskResult> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      log('dvo', 'deploy.start', { input: { goal: task.goal }, retry: retries > 0, retry_count: retries });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }],
        messages: [{
          role: 'user',
          content: `Goal: ${task.goal}
Context: ${task.context}
Constraints: ${task.constraints.join('; ')}
Success criteria: ${task.success_criteria.join('; ')}

Produce a deployment plan:
1. Infrastructure changes needed (IaC, secrets, env config)
2. Canary rollout steps (5% → 50% → 100%)
3. Rollback procedure
4. Metrics/alerts to watch during rollout
5. Confirmation that QA has passed before any deploy step

If QA has not passed on this commit, return BLOCKED immediately.`,
        }],
      });

      const output = response.content[0].type === 'text' ? response.content[0].text : '';
      const blocked = /^blocked/i.test(output.trim());

      log('dvo', blocked ? 'deploy.blocked' : 'deploy.plan.done', { output: output.slice(0, 200) });

      return {
        task_id: task.id, agent: 'dvo', status: blocked ? 'blocked' : 'done',
        output, retries,
        issues: blocked ? ['DevOps blocked: ' + output.slice(0, 120)] : [],
        confidence: blocked ? 0 : 0.88,
        completed_at: new Date().toISOString(),
      };

    } catch (e) {
      retries++;
      log('dvo', 'deploy.error', { error: String(e), retry: true, retry_count: retries });
    }
  }

  return {
    task_id: task.id, agent: 'dvo', status: 'blocked',
    output: '', retries,
    issues: ['DevOps could not complete deployment plan'],
    confidence: 0,
    completed_at: new Date().toISOString(),
  };
}
