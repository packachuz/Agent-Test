import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { Requirement, Priority, TargetRepo } from '../shared/types.js';

export async function collectFromCLI(): Promise<Requirement> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise(res => rl.question(q, ans => res(ans.trim())));

  console.log('\n─── Agent IT Team · New Requirement ───\n');

  const title       = await ask('Title: ');
  const description = await ask('Description (or press Enter to open $EDITOR): ');
  const priorityRaw = await ask('Priority [low/medium/high] (default: medium): ');
  const touchesRaw  = await ask('Touches (comma-separated services/paths, or Enter to skip): ');
  const repoMode    = await ask('Target repo [new / existing / skip] (default: skip): ');

  let target_repo: TargetRepo | undefined;
  if (repoMode === 'new') {
    const org  = await ask('  Org (GitHub user or org): ');
    const name = await ask('  Repo name (slug): ');
    target_repo = { type: 'greenfield', org, name };
  } else if (repoMode === 'existing') {
    const url  = await ask('  Repo URL (https://github.com/<org>/<name>): ');
    const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (match) {
      target_repo = { type: 'existing', org: match[1], name: match[2], url };
    } else {
      console.warn('  Warning: could not parse org/name from URL — target_repo skipped');
    }
  }

  rl.close();

  const priority: Priority =
    (['low', 'medium', 'high'] as Priority[]).includes(priorityRaw as Priority)
      ? (priorityRaw as Priority)
      : 'medium';

  return {
    id: `req_${randomUUID().slice(0, 8)}`,
    source: 'cli',
    title,
    description,
    priority,
    touches: touchesRaw ? touchesRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
    constraints: {
      requireSecuritySignoff: true,
      requireQAPass: true,
      escalateOnLargeDiff: false,
    },
    received_at: new Date().toISOString(),
    ...(target_repo ? { target_repo } : {}),
  };
}
