import fs from 'node:fs';
import path from 'node:path';
import { RunState, TaskResult } from './types.js';

const STATE_FILE = path.resolve('state/current.json');

export function readState(): RunState | null {
  if (!fs.existsSync(STATE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as RunState;
}

export function writeState(state: RunState): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  state.updated_at = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function updateStatus(run_id: string, status: RunState['status']): void {
  const s = readState();
  if (!s || s.run_id !== run_id) return;
  s.status = status;
  writeState(s);
}

export function appendTaskResult(run_id: string, result: TaskResult): void {
  const s = readState();
  if (!s || s.run_id !== run_id) return;
  s.task_results = s.task_results.filter(r => r.task_id !== result.task_id);
  s.task_results.push(result);
  writeState(s);
}

export function clearState(): void {
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
}
