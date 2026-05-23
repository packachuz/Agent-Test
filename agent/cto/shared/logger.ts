import fs from 'node:fs';
import path from 'node:path';
import { LogEntry, AgentKey } from './types.js';

let currentRunId = '';
let logPath = '';

export function initLogger(runId: string): void {
  currentRunId = runId;
  const dir = path.resolve('runs');
  fs.mkdirSync(dir, { recursive: true });
  logPath = path.join(dir, `${runId}.jsonl`);
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
  const entry: LogEntry = {
    run_id: currentRunId,
    timestamp: new Date().toISOString(),
    agent,
    action,
    retry: opts.retry ?? false,
    retry_count: opts.retry_count ?? 0,
    ...opts,
  };

  const line = JSON.stringify(entry);
  if (logPath) fs.appendFileSync(logPath, line + '\n');

  // Always echo to stdout for live visibility
  const ts = new Date().toISOString().slice(11, 23);
  const prefix = `[${ts}] [${agent.toUpperCase().padEnd(6)}]`;
  console.log(`${prefix} ${action}${opts.error ? ` ERROR: ${opts.error}` : ''}`);
}

export function getLogPath(): string { return logPath; }
