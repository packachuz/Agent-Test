import { CTODecision, AutonomyVerdict, ChangeClass } from '../shared/types.js';

const FROZEN_PATHS = [
  'infra/', 'migrations/', 'auth/', 'payments/', '.github/', 'agent/', 'memory/domain.md',
];

const SAFE_CHANGE_CLASSES: ChangeClass[] = [
  'copy_edit', 'dead_code', 'bugfix', 'patch_bump', 'perf_tweak',
];

interface DiffStats {
  filesChanged: number;
  linesAdded: number;
  touchesPaths: string[];
  newDependencies: boolean;
  majorDepBump: boolean;
  changeClass: ChangeClass;
  ciGreen: boolean;
  testsAddedOrUpdated: boolean;
}

export function evaluateAutonomy(diff: DiffStats): AutonomyVerdict {
  const violations: string[] = [];

  if (diff.filesChanged > 5)
    violations.push(`${diff.filesChanged} files changed (limit 5)`);

  if (diff.linesAdded > 200)
    violations.push(`${diff.linesAdded} lines added (limit 200)`);

  for (const p of diff.touchesPaths) {
    const frozen = FROZEN_PATHS.find(fp => p.startsWith(fp));
    if (frozen) violations.push(`touches frozen path: ${p}`);
  }

  if (diff.newDependencies)
    violations.push('introduces new dependencies');

  if (diff.majorDepBump)
    violations.push('bumps a major dependency version');

  if (!diff.ciGreen)
    violations.push('CI is not green');

  if (!diff.testsAddedOrUpdated)
    violations.push('no tests added or updated for changed code');

  if (!SAFE_CHANGE_CLASSES.includes(diff.changeClass))
    violations.push(`change class '${diff.changeClass}' requires human review`);

  const self_merge = violations.length === 0;
  return {
    self_merge,
    reason: self_merge
      ? 'All autonomy checks passed — safe to self-merge.'
      : `Self-merge blocked: ${violations.join('; ')}.`,
    violations,
  };
}
