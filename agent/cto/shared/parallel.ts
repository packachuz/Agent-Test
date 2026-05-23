import { Task, TaskResult } from './types.js';
import { log } from './logger.js';

type AgentRunner = (task: Task) => Promise<TaskResult>;

export async function runGroup(
  tasks: Task[],
  runner: AgentRunner
): Promise<TaskResult[]> {
  log('system', `runGroup · dispatching ${tasks.length} task(s) in parallel`, {
    input: tasks.map(t => ({ id: t.id, agent: t.agent, goal: t.goal.slice(0, 80) })),
  });

  const settled = await Promise.allSettled(tasks.map(t => runner(t)));

  return settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;

    // Runner threw — convert to a blocked result so CTO can decide
    const task = tasks[i];
    log(task.agent, 'runner.threw', { error: String((s as PromiseRejectedResult).reason) });
    return {
      task_id: task.id,
      agent: task.agent,
      status: 'blocked' as const,
      output: '',
      retries: 0,
      issues: [`Unhandled exception: ${String((s as PromiseRejectedResult).reason)}`],
      confidence: 0,
      completed_at: new Date().toISOString(),
    };
  });
}

export async function runPlan(
  groups: Task[][],
  runner: AgentRunner
): Promise<TaskResult[]> {
  const allResults: TaskResult[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const groupResults = await runGroup(group, runner);
    allResults.push(...groupResults);

    const blocked = groupResults.filter(r => r.status === 'blocked');
    if (blocked.length > 0) {
      log('system', `runPlan · group ${i + 1} has ${blocked.length} blocked task(s) — stopping`, {
        output: blocked.map(r => ({ task_id: r.task_id, issues: r.issues })),
      });
      break; // CTO will handle the blocked state
    }

    log('system', `runPlan · group ${i + 1}/${groups.length} complete`);
  }

  return allResults;
}
