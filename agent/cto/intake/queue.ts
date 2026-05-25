import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Requirement, Priority } from '../shared/types.js';

const VALID_PRIORITIES = new Set<Priority>(['low', 'medium', 'high']);

export function loadQueue(filePath: string): Requirement[] {
  const raw: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(raw)) throw new Error(`Queue file must be a JSON array: ${filePath}`);

  return raw.map((r: Partial<Requirement>, i: number) => {
    const priority: Priority = VALID_PRIORITIES.has(r.priority as Priority)
      ? r.priority as Priority
      : 'medium';

    return {
      id: r.id ?? `req_queue_${i}_${randomUUID().slice(0, 8)}`,
      source: 'cli' as const,
      title: r.title ?? `Requirement ${i + 1}`,
      description: r.description ?? '',
      priority,
      touches: r.touches ?? [],
      constraints: r.constraints ?? {
        requireSecuritySignoff: false,
        requireQAPass: true,
        escalateOnLargeDiff: false,
      },
      received_at: new Date().toISOString(),
      ...(r.target_repo ? { target_repo: r.target_repo } : {}),
    };
  });
}
