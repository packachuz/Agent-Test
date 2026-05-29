// Per-run / per-day / per-month USD spend tracking with hard-kill caps.
// Caps locked in grill-me Q6: $2/run, $20/day, $50/month. Exceeding any cap
// throws BudgetExceededError, which the orchestrator surfaces as an
// escalation (run is logged as 'failed-budget' and the workflow opens an
// issue per grill-me Q8).
//
// State files live under state/cost-*.json. Day and month totals persist
// across runs; run totals reset per process via setRunId().

import fs from 'node:fs';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';

const STATE_DIR = path.resolve('state');

// Caps in USD. ENV overrides for dev/testing.
export const CAP_PER_RUN_USD   = Number(process.env.CTO_CAP_PER_RUN_USD   ?? 2);
export const CAP_PER_DAY_USD   = Number(process.env.CTO_CAP_PER_DAY_USD   ?? 20);
export const CAP_PER_MONTH_USD = Number(process.env.CTO_CAP_PER_MONTH_USD ?? 50);

// Per-million-token prices (USD). Update when models / pricing change.
const PRICE_TABLE: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-pro':   { input: 1.25, output: 10.0 },
};

export class BudgetExceededError extends Error {
  constructor(scope: 'run' | 'day' | 'month', spentUsd: number, capUsd: number) {
    super(`Budget exceeded for ${scope}: $${spentUsd.toFixed(4)} > $${capUsd.toFixed(2)}`);
    this.name = 'BudgetExceededError';
  }
}

interface SpendCounter { run_id: string; usd: number }

// Per-run spend is scoped via AsyncLocalStorage so that parallel runs (queue
// mode runs runRequirement() concurrently via Promise.allSettled) each get
// their own isolated counter — a module global would let one run reset/clobber
// another's accumulated spend and defeat the per-run cap.
const runStorage = new AsyncLocalStorage<SpendCounter>();

// Run `fn` within a fresh per-run spend context. Replaces the old setRunId().
export function withRunBudget<T>(runId: string, fn: () => Promise<T>): Promise<T> {
  return runStorage.run({ run_id: runId, usd: 0 }, fn);
}

function currentCounter(): SpendCounter | undefined {
  return runStorage.getStore();
}

export function getRunSpendUsd(): number {
  return currentCounter()?.usd ?? 0;
}

function todayKey(): string  { return new Date().toISOString().slice(0, 10); } // YYYY-MM-DD
function monthKey(): string  { return new Date().toISOString().slice(0, 7); }  // YYYY-MM

function readPersistent(key: string): number {
  const file = path.join(STATE_DIR, `cost-${key}.json`);
  if (!fs.existsSync(file)) return 0;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return typeof data.usd === 'number' ? data.usd : 0;
  } catch {
    return 0;
  }
}

function writePersistent(key: string, usd: number): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const file = path.join(STATE_DIR, `cost-${key}.json`);
  fs.writeFileSync(file, JSON.stringify({ usd, updated_at: new Date().toISOString() }, null, 2));
}

export function estimateUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICE_TABLE[model];
  if (!p) return 0;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

// Call BEFORE each generate() — throws if running this call would exceed any cap.
// We can't know the actual cost yet, so we just check current counters. The
// real protection is recordSpend() throwing after the call lands.
export function preflightBudget(): void {
  const runCounter = currentCounter();
  if (runCounter && runCounter.usd >= CAP_PER_RUN_USD) {
    throw new BudgetExceededError('run', runCounter.usd, CAP_PER_RUN_USD);
  }
  const day = readPersistent(`day-${todayKey()}`);
  if (day >= CAP_PER_DAY_USD) {
    throw new BudgetExceededError('day', day, CAP_PER_DAY_USD);
  }
  const month = readPersistent(`month-${monthKey()}`);
  if (month >= CAP_PER_MONTH_USD) {
    throw new BudgetExceededError('month', month, CAP_PER_MONTH_USD);
  }
}

// Call AFTER each generate() — records the actual spend and trips a cap if
// this call pushed us over.
export function recordSpend(model: string, inputTokens: number, outputTokens: number): number {
  const usd = estimateUsd(model, inputTokens, outputTokens);
  if (usd === 0) return 0;

  const runCounter = currentCounter();
  if (runCounter) runCounter.usd += usd;

  const dayKey   = `day-${todayKey()}`;
  const monthKey_ = `month-${monthKey()}`;
  const day   = readPersistent(dayKey)   + usd;
  const month = readPersistent(monthKey_) + usd;
  writePersistent(dayKey,   day);
  writePersistent(monthKey_, month);

  if (runCounter && runCounter.usd > CAP_PER_RUN_USD) throw new BudgetExceededError('run',   runCounter.usd, CAP_PER_RUN_USD);
  if (day                          > CAP_PER_DAY_USD) throw new BudgetExceededError('day',   day,            CAP_PER_DAY_USD);
  if (month                        > CAP_PER_MONTH_USD) throw new BudgetExceededError('month', month,        CAP_PER_MONTH_USD);

  return usd;
}
