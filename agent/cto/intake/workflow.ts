// Intake for GitHub Actions workflow_dispatch runs.
//
// The .github/workflows/cto-run.yml workflow sets these env vars from
// workflow inputs, then calls `tsx agent/cto/index.ts --intake=workflow`.
// Required: INTAKE_TITLE, INTAKE_DESCRIPTION
// Optional: INTAKE_PRIORITY (low|medium|high; default medium),
//           INTAKE_TARGET_REPO_URL (https://github.com/<org>/<name>),
//           INTAKE_TOUCHES (comma-separated paths)
//
// Validation mirrors intake/cli.ts so the rest of the pipeline can't tell
// where a Requirement came from.

import { randomUUID } from 'node:crypto';
import { Requirement, Priority, TargetRepo } from '../shared/types.js';

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v || !v.trim()) throw new Error(`Missing required workflow input: ${key}`);
  return v.trim();
}

export function collectFromWorkflow(): Requirement {
  const title       = requireEnv('INTAKE_TITLE');
  const description = requireEnv('INTAKE_DESCRIPTION');

  const priorityRaw = (process.env.INTAKE_PRIORITY ?? 'medium').trim().toLowerCase();
  const priority: Priority = (['low', 'medium', 'high'] as Priority[]).includes(priorityRaw as Priority)
    ? (priorityRaw as Priority)
    : 'medium';

  const touchesRaw = process.env.INTAKE_TOUCHES ?? '';
  const touches = touchesRaw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  let target_repo: TargetRepo | undefined;
  const repoUrl = (process.env.INTAKE_TARGET_REPO_URL ?? '').trim();
  if (repoUrl) {
    if (!repoUrl.startsWith('https://github.com/')) {
      throw new Error(`INTAKE_TARGET_REPO_URL must start with https://github.com/, got: ${repoUrl}`);
    }
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!match) throw new Error(`Could not parse org/name from INTAKE_TARGET_REPO_URL: ${repoUrl}`);
    target_repo = { type: 'existing', org: match[1], name: match[2], url: repoUrl };
  }

  return {
    id: `req_${randomUUID().slice(0, 8)}`,
    source: 'workflow',
    title,
    description,
    priority,
    touches,
    constraints: {
      requireSecuritySignoff: priority === 'high',
      requireQAPass: true,
      escalateOnLargeDiff: true,
    },
    target_repo,
    received_at: new Date().toISOString(),
  };
}
