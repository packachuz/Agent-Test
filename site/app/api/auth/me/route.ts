import { NextResponse } from "next/server";

// Dev-only stub: lets the dashboard SPA past its auth gate so the prototype
// pages render. Replace with real OIDC before any production launch.
// See ADR-006 in memory/decisions.md.
export async function GET() {
  return NextResponse.json({
    user: { email: "demo@agent-test.local", name: "Demo User" },
  });
}
