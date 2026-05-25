import fs from 'node:fs';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { LogEntry, AgentKey } from './types.js';

const runStorage = new AsyncLocalStorage<string>();

export function initLogger(_runId: string): void {
  fs.mkdirSync(path.resolve('runs'), { recursive: true });
}

export function withRunId<T>(runId: string, fn: () => Promise<T>): Promise<T> {
  return runStorage.run(runId, fn);
}

export function log(
  agent: AgentKey | 'system',
  action: string,
  opts: {
    input?: unknown;
    output?: unknown;
    reflection?: string;
    retry?: boolean;
    retry_count?: number;
    duration_ms?: number;
    error?: string;
  } = {}
): void {
  const runId = runStorage.getStore() ?? '';
  const entry: LogEntry = {
    run_id: runId,
    timestamp: new Date().toISOString(),
    agent,
    action,
    retry: opts.retry ?? false,
    retry_count: opts.retry_count ?? 0,
    ...opts,
  };

  const line = JSON.stringify(entry);
  if (runId) {
    const logPath = path.join(path.resolve('runs'), `${runId}.jsonl`);
    fs.appendFileSync(logPath, line + '\n');
  }

  const ts = new Date().toISOString().slice(11, 23);
  const runTag = runId ? ` [${runId.slice(4, 12)}]` : '';
  const prefix = `[${ts}]${runTag} [${agent.toUpperCase().padEnd(6)}]`;
  console.log(`${prefix} ${action}${opts.error ? ` ERROR: ${opts.error}` : ''}`);
}

export function getLogPath(): string {
  const runId = runStorage.getStore() ?? '';
  return path.join(path.resolve('runs'), `${runId}.jsonl`);
}
