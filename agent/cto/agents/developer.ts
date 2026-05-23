import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { Task, TaskResult } from '../shared/types.js';
import { log } from '../shared/logger.js';

const client = new Anthropic();
const MAX_RETRIES = 3;

function systemPrompt(): string {
  const p = path.resolve('.claude/agents/developer.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : 'You are the Developer Agent. Implement the plan.';
}

export async function runDeveloper(task: Task): Promise<TaskResult> {
  let retries = 0;
  let lastError = '';
  let previousAttempt = '';

  while (retries < MAX_RETRIES) {
    try {
      log('dev', 'implement.start', { input: { goal: task.goal }, retry: retries > 0, retry_count: retries });

      const messages: Anthropic.MessageParam[] = [{
        role: 'user',
        content: `Goal: ${task.goal}
Context: ${task.context}
Constraints: ${task.constraints.join('; ')}
Success criteria: ${task.success_criteria.join('; ')}

${retries > 0
  ? `Your previous attempt was discarded because: ${lastError}\nRewrite from scratch with a different approach.\nPrevious attempt summary: ${previousAttempt.slice(0, 300)}`
  : ''}

Produce:
1. The code changes (show as unified diff or full file contents)
2. Test changes or additions
3. Brief rationale for each decision

Only touch files within the task scope. If you need to touch something outside scope, report BLOCKED instead.`,
      }];

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8096,
        system: [{ type: 'text', text: systemPrompt(), cache_control: { type: 'ephemeral' } }],
        messages,
      });

      const output = response.content[0].type === 'text' ? response.content[0].text : '';

      if (output.toLowerCase().includes('blocked:') || output.toLowerCase().startsWith('blocked')) {
        const reason = output.slice(0, 300);
        log('dev', 'implement.blocked', { reflection: reason });
        return {
          task_id: task.id, agent: 'dev', status: 'blocked',
          output, retries, issues: [reason], confidence: 0,
          completed_at: new Date().toISOString(),
        };
      }

      const hasTests = /test|spec|assert|expect/i.test(output);
      const hasCode = /```|function|class|def |fn |async /.test(output);

      if (!hasCode && retries < MAX_RETRIES - 1) {
        previousAttempt = output;
        lastError = 'No code produced — output contained only prose';
        retries++;
        log('dev', 'implement.reflect', { reflection: lastError, retry: true, retry_count: retries });
        continue;
      }

      log('dev', 'implement.done', { output: `hasTests=${hasTests} · ${output.slice(0, 150)}` });
      return {
        task_id: task.id, agent: 'dev', status: 'done',
        output, retries,
        issues: !hasTests ? ['No tests found in output'] : [],
        confidence: hasTests ? 0.85 : 0.5,
        completed_at: new Date().toISOString(),
      };

    } catch (e) {
      lastError = String(e);
      retries++;
      log('dev', 'implement.error', { error: lastError, retry: true, retry_count: retries });
    }
  }

  return {
    task_id: task.id, agent: 'dev', status: 'blocked',
    output: '', retries,
    issues: [`Failed after ${MAX_RETRIES} attempts: ${lastError}`],
    confidence: 0,
    completed_at: new Date().toISOString(),
  };
}
