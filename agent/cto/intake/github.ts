import { randomUUID } from 'node:crypto';
import { Requirement, Priority } from '../shared/types.js';

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
  html_url: string;
}

function extractPriority(labels: { name: string }[]): Priority {
  for (const l of labels) {
    if (/high|urgent|p0|p1/.test(l.name.toLowerCase())) return 'high';
    if (/low|nice.to.have|backlog/.test(l.name.toLowerCase())) return 'low';
  }
  return 'medium';
}

function extractTouches(body: string): string[] {
  const match = body.match(/touches?:([^\n]+)/i);
  if (!match) return [];
  return match[1].split(',').map(s => s.trim()).filter(Boolean);
}

export function fromGitHubIssue(issue: GitHubIssue): Requirement {
  return {
    id: `req_gh${issue.number}`,
    source: 'github_issue',
    title: issue.title,
    description: issue.body ?? '',
    priority: extractPriority(issue.labels),
    touches: extractTouches(issue.body ?? ''),
    constraints: {
      requireSecuritySignoff: issue.labels.some(l => /security|auth|payment/.test(l.name)),
      requireQAPass: true,
      escalateOnLargeDiff: false,
    },
    received_at: new Date().toISOString(),
    raw: issue,
  };
}

// Called by the GitHub Actions workflow via stdin JSON
export async function collectFromGitHub(): Promise<Requirement> {
  const raw = await new Promise<string>((res, rej) => {
    let data = '';
    process.stdin.on('data', chunk => (data += chunk));
    process.stdin.on('end', () => res(data));
    process.stdin.on('error', rej);
  });
  const issue: GitHubIssue = JSON.parse(raw);
  return fromGitHubIssue(issue);
}
