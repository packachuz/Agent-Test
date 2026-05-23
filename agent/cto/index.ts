import { randomUUID } from 'node:crypto';
import { RunState, Requirement } from './shared/types.js';
import { initLogger, log } from './shared/logger.js';
import { writeState, updateStatus } from './shared/state.js';
import { runPlan } from './shared/parallel.js';
import { dispatch } from './agents/dispatcher.js';
import { triage, decompose, synthesize, updateRoadmap } from './cto-agent.js';
import { evaluateAutonomy } from './policy/autonomy.js';
import { buildEscalationReport, printEscalationReport } from './policy/escalation.js';
import { collectFromCLI } from './intake/cli.js';
import { collectFromGitHub } from './intake/github.js';

const args = process.argv.slice(2);
const intakeMode = args.find(a => a.startsWith('--intake='))?.split('=')[1] ?? 'cli';
const dryRun     = args.includes('--dry-run');
const fixture    = args.find(a => a.startsWith('--fixture='))?.split('=')[1];

async function getRequirement(): Promise<Requirement> {
  if (fixture) return buildFixture(fixture);
  if (intakeMode === 'github') return collectFromGitHub();
  return collectFromCLI();
}

function buildFixture(name: string): Requirement {
  const fixtures: Record<string, Partial<Requirement>> = {
    'high-severity-bug': {
      title: 'Fix null pointer in payment processor causing 500s',
      description: 'The /api/payments endpoint throws NPE when currency field is missing. Affects ~2% of transactions.',
      priority: 'high',
      touches: ['services/payment-processor', 'auth/'],
    },
    'small-bugfix': {
      title: 'Fix typo in error message for invalid email',
      description: 'Error message says "invalide email" instead of "invalid email" in auth/validate.go',
      priority: 'low',
      touches: ['auth/validate.go'],
    },
  };
  const base = fixtures[name] ?? fixtures['small-bugfix'];
  return {
    id: `req_fixture_${name}`,
    source: 'cli',
    description: '',
    priority: 'medium',
    touches: [],
    constraints: { requireSecuritySignoff: true, requireQAPass: true, escalateOnLargeDiff: false },
    received_at: new Date().toISOString(),
    ...base,
  } as Requirement;
}

async function main(): Promise<void> {
  const run_id = `run_${randomUUID().slice(0, 8)}`;
  initLogger(run_id);

  log('system', 'bootstrap', { output: { run_id, dryRun, intakeMode } });

  // 1. Intake
  const requirement = await getRequirement();
  log('cto', 'requirement.received', { input: { id: requirement.id, title: requirement.title } });

  // 2. Initialise state
  const state: RunState = {
    run_id,
    requirement,
    task_results: [],
    status: 'bootstrapping',
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  writeState(state);

  // 3. Triage
  updateStatus(run_id, 'triaging');
  const { approved, memo, reason } = await triage(requirement, state);

  if (!approved) {
    log('cto', 'triage.discard', { output: { reason } });
    console.log(`\n✗ Requirement discarded: ${reason}\n`);
    updateStatus(run_id, 'done');
    return;
  }

  // 4. Decompose into task groups
  updateStatus(run_id, 'planning');
  const plan = await decompose(requirement, memo, state);
  log('cto', 'plan.ready', { output: { groups: plan.task_groups.length, tasks: plan.task_groups.flat().length } });

  if (dryRun) {
    console.log('\n── DRY RUN ── Plan (would execute):');
    plan.task_groups.forEach((g, i) => {
      console.log(`\nGroup ${i + 1} (parallel):`);
      g.forEach(t => console.log(`  [${t.agent}] ${t.goal}`));
    });
    updateStatus(run_id, 'done');
    return;
  }

  // 5. Execute
  updateStatus(run_id, 'executing');
  const results = await runPlan(plan.task_groups, dispatch);
  state.task_results = results;
  writeState(state);

  // 6. CTO synthesises and decides
  updateStatus(run_id, 'reviewing');
  const decision = await synthesize(state);

  // 7. Autonomy gate
  const diffStats = {
    filesChanged: 3,          // In production: parse from git diff --stat
    linesAdded: 80,
    touchesPaths: requirement.touches,
    newDependencies: false,
    majorDepBump: false,
    changeClass: 'bugfix' as const,
    ciGreen: decision.outcome === 'approved',
    testsAddedOrUpdated: results.some(r => r.agent === 'qa' && r.status === 'done'),
  };
  const verdict = evaluateAutonomy(diffStats);

  if (decision.outcome === 'approved' && verdict.self_merge) {
    log('cto', 'decision.approve', { output: { verdict: 'self-merge' } });
    console.log(`\n✓ Approved — self-merge eligible\n  ${verdict.reason}\n`);
  } else {
    const report = buildEscalationReport(state, verdict);
    printEscalationReport(report);
  }

  // 8. Update roadmap
  await updateRoadmap(state);

  updateStatus(run_id, 'done');
  log('system', 'run.complete', { output: { run_id, outcome: decision.outcome } });
  console.log(`\nRun ${run_id} complete. Log: runs/${run_id}.jsonl\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
