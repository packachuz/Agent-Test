import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

type RunSummary = {
  id: string;
  title: string;
  outcome: string | null;
  status: "done" | "running" | "failed";
  files_changed: number | null;
  received_at: string | null;
};

async function summarize(filePath: string): Promise<RunSummary | null> {
  let text: string;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  const events: Array<Record<string, unknown>> = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      /* skip malformed line */
    }
  }
  if (events.length === 0) return null;

  let id = path.basename(filePath, ".jsonl");
  let title = "(no title)";
  let outcome: string | null = null;
  let receivedAt: string | null = null;
  let filesChanged: number | null = null;

  for (const e of events) {
    if (typeof e.run_id === "string") id = e.run_id;
    const req = e.requirement as { title?: unknown } | undefined;
    if (req && typeof req.title === "string") title = req.title;
    if (typeof e.outcome === "string") outcome = e.outcome;
    if (!outcome && typeof e.decision === "string") outcome = e.decision;
    if (typeof e.received_at === "string") receivedAt = e.received_at;
    if (Array.isArray(e.files_changed)) filesChanged = e.files_changed.length;
  }

  return {
    id,
    title,
    outcome,
    status: "done",
    files_changed: filesChanged,
    received_at: receivedAt,
  };
}

export async function GET() {
  const runsDir = path.join(process.cwd(), "data", "runs");
  let files: string[];
  try {
    files = await fs.readdir(runsDir);
  } catch {
    return NextResponse.json({ runs: [] });
  }
  const summaries = await Promise.all(
    files
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => summarize(path.join(runsDir, f))),
  );
  const runs = summaries
    .filter((s): s is RunSummary => s !== null)
    .sort((a, b) => (b.received_at ?? "").localeCompare(a.received_at ?? ""));
  return NextResponse.json({ runs });
}
