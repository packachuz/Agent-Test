import { Requirement } from '../shared/types.js';
import { randomUUID } from 'node:crypto';

interface WebhookPayload {
  title: string;
  description?: string;
  priority?: string;
  touches?: string[];
  source_system?: string;
}

// Validates and normalises an incoming webhook payload into a Requirement.
// The actual HTTP server is expected to call this and then pass the result
// to the CTO pipeline. This keeps the intake layer stateless and testable.
export function fromWebhookPayload(payload: WebhookPayload): Requirement {
  if (!payload.title?.trim()) {
    throw new Error('Webhook payload missing required field: title');
  }

  const priority = (['low','medium','high'] as const).includes(payload.priority as any)
    ? (payload.priority as 'low'|'medium'|'high')
    : 'medium';

  return {
    id: `req_wh${randomUUID().slice(0,8)}`,
    source: 'webhook',
    title: payload.title.trim(),
    description: payload.description?.trim() ?? '',
    priority,
    touches: payload.touches ?? [],
    constraints: {
      requireSecuritySignoff: true,
      requireQAPass: true,
      escalateOnLargeDiff: false,
    },
    received_at: new Date().toISOString(),
    raw: payload,
  };
}
