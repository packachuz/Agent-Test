import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { Task, TaskResult } from '../shared/types.js';
import { log } from '../shared/logger.js';

const client = new Anthropic();
const MAX_RETRIES = 2;

function systemPrompt(): string {
  const p = path.resolve('.claude/agents/qa.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : 'You are the QA Agent. Verify the implementation.';
}

function lessons(): string {
  const p = path.resolve('memory/lessons.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

export async function runQA(task: Task): Promise<TaskResult> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      log('qa', 'verify.start', { input: { goal: task.goal }, retry: retries > 0, retry_count: retries });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: [
          { type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } },
          { type: 'text', text: `## Known flaky tests and lessons\n\n${lessons()}`, cache_control: { type: 'ephemeral' } },
        ],
        messages: [{
          role: 'user',
          content: `Goal: ${task.goal}
Context: ${task.context}
Success criteria: ${task.success_criteria.join('; ')}

Perform adversarial QA:
1. Review the implementation for correctness against success criteria
2. Identify edge cases and boundary conditions
3. Write targeted test cases specific to this requirement
4. Check isolation boundaries (no cross-tenant data leakage, no privilege escalation)
5. Note any known flaky patterns from lessons.md

Return your verdict as: PASS or FAIL, followed by your full report.
If FAIL, list every issue clearly — this cannot be overridden without human sign-off.`,
        }],
      });

      const output = response.content[0].type === 'text' ? response.content[0].text : '';
      const pass = /^pass/i.test(output.trim());

      log('qa', pass ? 'verify.pass' : 'verify.fail', { output: output.slice(0, 200) });

      if (!pass && retries < MAX_RETRIES - 1) {
        retries++;
        log('qa', 'verify.retry', { reflection: 'Will re-run verification with fresh context', retry: true, retry_count: retries });
        continue;
      }

      return {
        task_id: task.id, agent: 'qa', status: pass ? 'done' : 'blocked',
        output, retries,
        issues: pass ? [] : ['QA verdict: FAIL — see output for details'],
        confidence: pass ? 0.92 : 0,
        completed_at: new Date().toISOString(),
      };

    } catch (e) {
      retries++;
      log('qa', 'verify.error', { error: String(e), retry: true, retry_count: retries });
    }
  }

  return {
    task_id: task.id, agent: 'qa', status: 'blocked',
    output: '', retries,
    issues: ['QA could not complete verification'],
    confidence: 0,
    completed_at: new Date().toISOString(),
  };
}
