import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

const ID_RE = /^run_[A-Za-z0-9]+$/;

type Event = Record<string, unknown>;

type Summary = {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  outcome: string | null;
  decision: string | null;
  status: "done" | "running" | "failed";
  received_at: string | null;
  completed_at: string | null;
  files_changed: string[] | null;
};

function summarize(id: string, events: Event[]): Summary {
  let title = "(no title)";
  let description: string | null = null;
  let priority: string | null = null;
  let outcome: string | null = null;
  let decision: string | null = null;
  let receivedAt: string | null = null;
  let completedAt: string | null = null;
  let filesChanged: string[] | null = null;

  for (const e of events) {
    const req = e.requirement as
      | { title?: unknown; description?: unknown; priority?: unknown }
      | undefined;
    if (req) {
      if (typeof req.title === "string") title = req.title;
      if (typeof req.description === "string") description = req.description;
      if (typeof req.priority === "string") priority = req.priority;
    }
    if (typeof e.outcome === "string") outcome = e.outcome;
    if (typeof e.decision === "string") decision = e.decision;
    if (typeof e.received_at === "string") receivedAt = e.received_at;
    const ts = e.timestamps as { received?: unknown; completed?: unknown } | undefined;
    if (ts) {
      if (typeof ts.received === "string" && !receivedAt) receivedAt = ts.received;
      if (typeof ts.completed === "string") completedAt = ts.completed;
    }
    if (Array.isArray(e.files_changed)) {
      filesChanged = e.files_changed.filter((x): x is string => typeof x === "string");
    }
  }

  return {
    id,
    title,
    description,
    priority,
    outcome,
    decision,
    status: "done",
    received_at: receivedAt,
    completed_at: completedAt,
    files_changed: filesChanged,
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const filePath = path.join(process.cwd(), "data", "runs", `${id}.jsonl`);
  let text: string;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const events: Event[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      events.push(JSON.parse(t));
    } catch {
      /* skip */
    }
  }
  return NextResponse.json({
    summary: summarize(id, events),
    events,
  });
}
