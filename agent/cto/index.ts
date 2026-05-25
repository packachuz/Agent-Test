import { randomUUID } from 'node:crypto';
import { RunState, Requirement } from './shared/types.js';
import { initLogger, log, withRunId } from './shared/logger.js';
import { writeState, updateStatus } from './shared/state.js';
import { runPlan } from './shared/parallel.js';
import { dispatch } from './agents/dispatcher.js';
import { triage, decompose, synthesize, updateRoadmap } from './cto-agent.js';
import { evaluateAutonomy } from './policy/autonomy.js';
import { buildEscalationReport, printEscalationReport } from './policy/escalation.js';
import { collectFromCLI } from './intake/cli.js';
import { collectFromGitHub } from './intake/github.js';
import { loadQueue } from './intake/queue.js';

const args = process.argv.slice(2);
const intakeMode = args.find(a => a.startsWith('--intake='))?.split('=')[1] ?? 'cli';
const dryRun     = args.includes('--dry-run');
const fixture    = args.find(a => a.startsWith('--fixture='))?.split('=')[1];
const queueFile  = args.find(a => a.startsWith('--queue-file='))?.split('=')[1];

async function getSingleRequirement(): Promise<Requirement> {
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

async function runRequirement(requirement: Requirement): Promise<void> {
  const run_id = `run_${randomUUID().slice(0, 8)}`;
  initLogger(run_id);

  await withRunId(run_id, async () => {
    log('system', 'bootstrap', { output: { run_id, dryRun, intakeMode } });
    log('cto', 'requirement.received', { input: { id: requirement.id, title: requirement.title } });

    // Initialise state
    const state: RunState = {
      run_id,
      requirement,
      task_results: [],
      status: 'bootstrapping',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    writeState(state);

    // Triage
    updateStatus(run_id, 'triaging');
    const { approved, memo, reason } = await triage(requirement, state);

    if (!approved) {
      log('cto', 'triage.discard', { output: { reason } });
      console.log(`\n[${run_id}] ✗ Discarded: ${reason}\n`);
      updateStatus(run_id, 'done');
      return;
    }

    // Decompose into task groups
    updateStatus(run_id, 'planning');
    const plan = await decompose(requirement, memo, state);
    log('cto', 'plan.ready', { output: { groups: plan.task_groups.length, tasks: plan.task_groups.flat().length } });

    if (dryRun) {
      console.log(`\n[${run_id}] ── DRY RUN ── Plan (would execute):`);
      plan.task_groups.forEach((g, i) => {
        console.log(`\n  Group ${i + 1} (parallel):`);
        g.forEach(t => console.log(`    [${t.agent}] ${t.goal}`));
      });
      updateStatus(run_id, 'done');
      return;
    }

    // Execute
    updateStatus(run_id, 'executing');
    const results = await runPlan(plan.task_groups, dispatch);
    state.task_results = results;
    writeState(state);

    // CTO synthesises and decides
    updateStatus(run_id, 'reviewing');
    const decision = await synthesize(state);

    // Autonomy gate
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
      console.log(`\n[${run_id}] ✓ Approved — self-merge eligible\n  ${verdict.reason}\n`);
    } else {
      const report = buildEscalationReport(state, verdict);
      printEscalationReport(report);
    }

    // Update roadmap
    await updateRoadmap(state);

    updateStatus(run_id, 'done');
    log('system', 'run.complete', { output: { run_id, outcome: decision.outcome } });
    console.log(`\n[${run_id}] Complete. Log: runs/${run_id}.jsonl\n`);
  });
}

async function main(): Promise<void> {
  if (intakeMode === 'queue') {
    if (!queueFile) {
      console.error('Error: --queue-file=<path> is required for --intake=queue');
      process.exit(1);
    }
    const requirements = loadQueue(queueFile);
    if (requirements.length === 0) {
      console.error('Error: queue file contains no requirements');
      process.exit(1);
    }
    console.log(`\nQueue: running ${requirements.length} requirement(s) in parallel...\n`);
    const settled = await Promise.allSettled(requirements.map(r => runRequirement(r)));
    const passed  = settled.filter(s => s.status === 'fulfilled').length;
    const failed  = settled.length - passed;
    settled.forEach((s, i) => {
      if (s.status === 'rejected') {
        console.error(`  [req ${i + 1}] failed: ${String(s.reason)}`);
      }
    });
    console.log(`\nQueue complete: ${passed}/${requirements.length} succeeded${failed > 0 ? `, ${failed} failed` : ''}\n`);
  } else {
    const requirement = await getSingleRequirement();
    await runRequirement(requirement);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
