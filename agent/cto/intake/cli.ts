import readline from 'node:readline';
import { randomUUID } from 'node:crypto';
import { Requirement, Priority } from '../shared/types.js';

export async function collectFromCLI(): Promise<Requirement> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise(res => rl.question(q, ans => res(ans.trim())));

  console.log('\n─── Agent IT Team · New Requirement ───\n');

  const title       = await ask('Title: ');
  const description = await ask('Description (or press Enter to open $EDITOR): ');
  const priorityRaw = await ask('Priority [low/medium/high] (default: medium): ');
  const touchesRaw  = await ask('Touches (comma-separated services/paths, or Enter to skip): ');

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
  };
}
