import fs from 'node:fs';
import path from 'node:path';
import { Task, TaskResult } from '../shared/types.js';
import { log } from '../shared/logger.js';
import { generate, MODELS } from '../shared/gemini.js';

const MAX_RETRIES = 2;

function systemPrompt(): string {
  const p = path.resolve('.claude/agents/security.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : 'You are the Security Agent. Review for threats and vulnerabilities.';
}

function domain(): string {
  const p = path.resolve('memory/domain.md');
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

export async function runSecurity(task: Task): Promise<TaskResult> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      log('sec', 'review.start', { input: { goal: task.goal }, retry: retries > 0, retry_count: retries });

      const output = await generate({
        model: MODELS.pro,
        maxOutputTokens: 4096,
        systemInstruction: `${systemPrompt()}\n\n## Security policies and domain constraints\n\n${domain()}`,
        prompt: `Goal: ${task.goal}
Context: ${task.context}
Constraints: ${task.constraints.join('; ')}

Perform a full security review:
1. STRIDE threat model for the change
2. OWASP Top 10 check on the diff
3. Secrets/credential handling review
4. Access control and privilege escalation check
5. Compliance check against domain.md policies (SOC2, GDPR, internal)

Return APPROVED or BLOCKED, followed by your full findings.
If BLOCKED, list every issue — you have authority to stop this release.`,
      });
      const approved = /^approved/i.test(output.trim());
      const p0 = /P0|critical|severity.?0/i.test(output);

      log('sec', approved ? 'review.approved' : 'review.blocked', { output: output.slice(0, 200) });

      if (p0) {
        log('sec', 'review.P0', { reflection: 'P0 issue found — escalating immediately' });
      }

      return {
        task_id: task.id, agent: 'sec', status: approved ? 'done' : 'blocked',
        output, retries,
        issues: approved ? [] : ['Security review: BLOCKED — see output'],
        confidence: approved ? 0.95 : 0,
        completed_at: new Date().toISOString(),
      };

    } catch (e) {
      if (e instanceof Error && e.name === 'BudgetExceededError') throw e;
      retries++;
      log('sec', 'review.error', { error: String(e), retry: true, retry_count: retries });
    }
  }

  return {
    task_id: task.id, agent: 'sec', status: 'blocked',
    output: '', retries,
    issues: ['Security could not complete review'],
    confidence: 0,
    completed_at: new Date().toISOString(),
  };
}
