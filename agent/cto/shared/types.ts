export type Priority = 'low' | 'medium' | 'high';
export type IntakeSource = 'cli' | 'github_issue' | 'webhook';
export type TaskStatus = 'pending' | 'running' | 'done' | 'blocked' | 'escalated';
export type AgentKey = 'cto' | 'arc' | 'dev' | 'qa' | 'dvo' | 'sec';
export type ChangeClass = 'copy_edit' | 'dead_code' | 'bugfix' | 'patch_bump' | 'perf_tweak' | 'feature' | 'infra' | 'migration' | 'security';

export interface TargetRepo {
  type: 'greenfield' | 'existing';
  org: string;
  name: string;
  url?: string;               // populated for 'existing'; set by DevOps repo-setup for 'greenfield'
}

export interface Requirement {
  id: string;
  source: IntakeSource;
  title: string;
  description: string;
  priority: Priority;
  touches: string[];          // repo paths / service names scoping agent access
  constraints: {
    requireSecuritySignoff: boolean;
    requireQAPass: boolean;
    escalateOnLargeDiff: boolean;
  };
  received_at: string;        // ISO-8601
  raw?: unknown;
  target_repo?: TargetRepo;
  workspace_path?: string;    // set after DevOps repo-setup completes; injected into all agent tasks
}

export interface Task {
  id: string;
  run_id: string;
  agent: AgentKey;
  goal: string;
  context: string;            // scoped context injected into sub-agent prompt
  constraints: string[];
  success_criteria: string[];
  depends_on: string[];       // task ids that must be done first
  status: TaskStatus;
  assigned_at?: string;
  completed_at?: string;
}

export interface TaskResult {
  task_id: string;
  agent: AgentKey;
  status: 'done' | 'blocked';
  output: string;             // structured result or markdown
  retries: number;
  issues: string[];           // problems found; empty if done
  confidence: number;         // 0-1
  completed_at: string;
}

export interface Plan {
  run_id: string;
  requirement_id: string;
  problem: string;
  hypothesis: string;
  change_sketch: string;
  success_metric: string;
  rollback_plan: string;
  task_groups: Task[][];      // groups run sequentially; tasks within a group run in parallel
  estimated_minutes: number;
}

export interface CTODecision {
  run_id: string;
  outcome: 'approved' | 'escalated';
  rationale: string;
  diff_summary?: string;
  escalation_reason?: string;
  pr_url?: string;
}

export interface RunState {
  run_id: string;
  requirement: Requirement;
  plan?: Plan;
  task_results: TaskResult[];
  decision?: CTODecision;
  status: 'bootstrapping' | 'triaging' | 'planning' | 'executing' | 'reviewing' | 'done' | 'failed';
  started_at: string;
  updated_at: string;
}

export interface LogEntry {
  run_id: string;
  timestamp: string;
  agent: AgentKey | 'system';
  action: string;
  input?: unknown;
  output?: unknown;
  reflection?: string;
  retry: boolean;
  retry_count: number;
  duration_ms?: number;
  error?: string;
}

export interface AutonomyVerdict {
  self_merge: boolean;
  reason: string;
  violations: string[];
}
