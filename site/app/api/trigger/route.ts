import { NextResponse } from "next/server";

// Triggers the CTO Run GitHub Actions workflow via workflow_dispatch.
//
// Security: the dashboard is public (grill-me Q10), so this endpoint is gated
// by a shared CTO_TRIGGER_KEY that the caller must supply and that lives only
// in Vercel server env — never shipped to the browser. The GitHub PAT
// (GITHUB_DISPATCH_TOKEN, fine-grained, Actions: read+write on this repo) also
// stays server-side. The agent's own per-day/per-month cost caps are the hard
// backstop if the key ever leaks.

const REPO = "packachuz/Agent-Test";
const WORKFLOW_FILE = "cto-run.yml";
const PRIORITIES = ["low", "medium", "high"];
const FIXTURES = ["none", "small-bugfix", "high-severity-bug"];

export async function POST(req: Request) {
  const triggerKey = process.env.CTO_TRIGGER_KEY;
  const dispatchToken = process.env.GITHUB_DISPATCH_TOKEN;
  if (!triggerKey || !dispatchToken) {
    return NextResponse.json(
      { error: "Trigger not configured: set CTO_TRIGGER_KEY and GITHUB_DISPATCH_TOKEN in Vercel env." },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.trigger_key !== "string" || body.trigger_key !== triggerKey) {
    return NextResponse.json({ error: "Invalid trigger key" }, { status: 403 });
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const priority = PRIORITIES.includes(String(body.priority)) ? String(body.priority) : "medium";
  const fixture = FIXTURES.includes(String(body.fixture)) ? String(body.fixture) : "none";

  // For a real (non-fixture) run, title + description are required by the
  // workflow. For a fixture run they're cosmetic but the workflow still
  // declares them required, so always send non-empty values.
  if (fixture === "none") {
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const inputs = {
    title: title || `fixture: ${fixture}`,
    description: description || `Smoke-test fixture run: ${fixture}`,
    priority,
    fixture,
  };

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dispatchToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs }),
    },
  );

  if (res.status === 204) {
    return NextResponse.json({ ok: true });
  }
  const detail = await res.text();
  return NextResponse.json(
    { error: `GitHub API ${res.status}: ${detail.slice(0, 300)}` },
    { status: 502 },
  );
}
