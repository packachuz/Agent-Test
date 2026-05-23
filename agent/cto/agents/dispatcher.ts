import { Task, TaskResult, AgentKey } from '../shared/types.js';
import { log } from '../shared/logger.js';
import { runArchitect } from './architect.js';
import { runDeveloper } from './developer.js';
import { runQA } from './qa.js';
import { runDevOps } from './devops.js';
import { runSecurity } from './security.js';

const RUNNERS: Record<AgentKey, (task: Task) => Promise<TaskResult>> = {
  cto: async () => { throw new Error('CTO cannot be dispatched as a sub-agent'); },
  arc: runArchitect,
  dev: runDeveloper,
  qa:  runQA,
  dvo: runDevOps,
  sec: runSecurity,
};

export async function dispatch(task: Task): Promise<TaskResult> {
  const runner = RUNNERS[task.agent];
  if (!runner) {
    log('system', `dispatch.unknown-agent`, { error: task.agent });
    return {
      task_id: task.id, agent: task.agent, status: 'blocked',
      output: '', retries: 0,
      issues: [`Unknown agent: ${task.agent}`],
      confidence: 0,
      completed_at: new Date().toISOString(),
    };
  }
  return runner(task);
}
