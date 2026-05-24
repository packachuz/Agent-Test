export default function Home() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "local";

  return (
    <main className="container">
      <h1>Agent-Test 👋</h1>
      <p>
        Autonomous multi-agent IT team — landing page and dashboard,
        deployed via Vercel.
      </p>

      <div className="card">
        <h2>Dashboard</h2>
        <p>
          The existing React SPA (run history, agents, memory) is served
          as static files.
        </p>
        <p>
          <a className="btn" href="/dashboard/">Open dashboard →</a>
        </p>
        <p className="meta">
          Note: the dashboard expects a backend at <code>/api/*</code>; on
          this static deploy it will fall through to the login view, which
          is normal — it just means there's no live backend yet.
        </p>
      </div>

      <p className="meta">
        Branch <code>{branch}</code> · Commit <code>{commit}</code>
      </p>
    </main>
  );
}
