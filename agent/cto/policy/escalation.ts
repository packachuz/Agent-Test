import { RunState, AutonomyVerdict } from '../shared/types.js';
import { log } from '../shared/logger.js';

export interface EscalationReport {
  run_id: string;
  title: string;
  reason: string;
  risk_summary: string;
  pr_label: string;
  tracking_issue_body: string;
}

export function buildEscalationReport(
  state: RunState,
  verdict: AutonomyVerdict
): EscalationReport {
  const req = state.requirement;
  const violations = verdict.violations.join('\n- ');
  const blockedTasks = state.task_results.filter(r => r.status === 'blocked');
  const blockedSummary = blockedTasks.length > 0
    ? blockedTasks.map(t => `  - ${t.agent}: ${t.issues.join(', ')}`).join('\n')
    : '  None';

  const tracking_issue_body = `## Run ${state.run_id} requires human review

**Requirement:** ${req.title}
**Priority:** ${req.priority}
**Source:** ${req.source}

### Why escalated
- ${violations || verdict.reason}

### Blocked tasks
${blockedSummary}

### What to do
1. Review the PR linked to this run.
2. Check the JSONL log at \`runs/${state.run_id}.jsonl\` for full trace.
3. Either approve the PR manually, or close it and re-submit a revised requirement.

_Escalated by CTO Agent · run ${state.run_id}_`;

  log('cto', 'escalation.report.built', {
    output: { run_id: state.run_id, violations: verdict.violations },
  });

  return {
    run_id: state.run_id,
    title: `[${state.run_id}] Needs human review: ${req.title}`,
    reason: verdict.reason,
    risk_summary: violations || 'See violations above',
    pr_label: 'needs-human-review',
    tracking_issue_body,
  };
}

export function printEscalationReport(report: EscalationReport): void {
  console.log('\n' + '═'.repeat(60));
  console.log('ESCALATION REPORT');
  console.log('═'.repeat(60));
  console.log(report.tracking_issue_body);
  console.log('═'.repeat(60) + '\n');
}
