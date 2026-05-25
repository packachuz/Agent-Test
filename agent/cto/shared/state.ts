import fs from 'node:fs';
import path from 'node:path';
import { RunState, TaskResult } from './types.js';

function stateFile(run_id: string): string {
  return path.resolve('state', `${run_id}.json`);
}

export function readState(run_id: string): RunState | null {
  const f = stateFile(run_id);
  if (!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, 'utf-8')) as RunState;
}

export function writeState(state: RunState): void {
  const f = stateFile(state.run_id);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  state.updated_at = new Date().toISOString();
  fs.writeFileSync(f, JSON.stringify(state, null, 2));
}

export function updateStatus(run_id: string, status: RunState['status']): void {
  const s = readState(run_id);
  if (!s) return;
  s.status = status;
  writeState(s);
}

export function appendTaskResult(run_id: string, result: TaskResult): void {
  const s = readState(run_id);
  if (!s) return;
  s.task_results = s.task_results.filter(r => r.task_id !== result.task_id);
  s.task_results.push(result);
  writeState(s);
}

export function clearState(run_id: string): void {
  const f = stateFile(run_id);
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

export function listActiveRuns(): RunState[] {
  const dir = path.resolve('state');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && f !== 'current.json')
    .flatMap(f => {
      try { return [JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')) as RunState]; }
      catch { return []; }
    })
    .filter(s => s.status !== 'done' && s.status !== 'failed');
}
