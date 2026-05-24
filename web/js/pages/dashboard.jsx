// Dashboard page

function ActiveRunCard({ state = "normal", onNav }) {
  if (state === "empty") {
    return (
      <div className="card">
        <div className="card-hdr">
          <span className="card-hdr-title">Active Run</span>
          <div className="grow"/>
          <span className="tag">idle</span>
        </div>
        <div className="state-empty">
          <div className="ico">{Ico.inbox}</div>
          <div className="ti">No active run</div>
          <div className="sb">Submit a requirement and the CTO Agent will triage it and dispatch the team.</div>
          <Btn kind="primary" onClick={() => onNav?.('requirements')}>{Ico.plus} New requirement</Btn>
        </div>
      </div>
    );
  }
  if (state === "loading") {
    return (
      <div className="card">
        <div className="card-hdr">
          <span className="card-hdr-title">Active Run</span>
          <div className="grow"/>
          <Pill kind="running">starting</Pill>
        </div>
        <div className="state-loading">
          <div className="ico" style={{color:'var(--accent)'}}>{Ico.spin}</div>
          <div className="ti">Bootstrapping CTO context</div>
          <div className="sb">Loading roadmap, decisions, and lessons memory · sealing run id…</div>
          <div className="bar"/>
        </div>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="card">
        <div className="card-hdr">
          <span className="card-hdr-title">Active Run</span>
          <div className="grow"/>
          <Pill kind="escalated">orchestrator error</Pill>
        </div>
        <div className="state-error">
          <div className="ico">{Ico.warn}</div>
          <div className="ti">CTO Agent failed to dispatch</div>
          <div className="sb" style={{fontFamily:'var(--font-mono)', fontSize:11.5, color:'var(--status-escalated)'}}>
            ToolUseError · agents.architect not registered (skill missing in opus pool)
          </div>
          <div style={{display:'flex', gap:8, marginTop:6}}>
            <Btn>View traceback</Btn>
            <Btn kind="primary">Retry dispatch</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-hdr">
        <span className="card-hdr-title">Active Run</span>
        <span className="card-hdr-sub">run_9c41</span>
        <div className="grow"/>
        <span className="elapsed">
          <span className="big">06:42</span>
          <span className="sub">elapsed · est 14:00</span>
        </span>
        <Btn kind="ghost sm" onClick={() => onNav?.('run-detail')}>View run →</Btn>
      </div>
      <div className="active-run">
        <div className="active-run-left">
          <div className="req-card">
            <div className="meta">
              <span>req_2031</span><span>·</span><span>high</span><span>·</span><span>source: cli</span>
            </div>
            <h3>Rotate identity provider keys across prod &amp; staging</h3>
            <p>Replace expiring OIDC signing keys, redeploy auth gateway, validate SSO for 14 downstream services.</p>
          </div>
          <div className="agents-line">
            <h4>Pipeline · 6 agents</h4>
            {[
              { k: "cto", task: "triage → dispatch(arc, dvo, sec) → await", status: "running" },
              { k: "arc", task: "key-rotation plan · 3 milestones", status: "done", dur: "1:18" },
              { k: "dev", task: "patch auth-gateway/keystore.go", status: "running" },
              { k: "qa",  task: "sso-smoke · 14 services", status: "pending", label: "pending dev" },
              { k: "dvo", task: "canary 5% → 50% → 100% in eu-west-1", status: "running" },
              { k: "sec", task: "verify JWKS rotation · token-replay scan", status: "blocked", label: "blocked · vault" },
            ].map(row => (
              <div className="agent-row" key={row.k}>
                <AgentGlyph k={row.k}/>
                <span className="name">{AGENTS.find(a => a.k === row.k)?.name}</span>
                <span className="task">{row.task}</span>
                <Pill kind={row.status}>{row.label || (row.dur ? `${row.status} · ${row.dur}` : row.status)}</Pill>
              </div>
            ))}
          </div>
        </div>
        <div className="active-run-right">
          <h4 style={{margin:'0 0 8px', fontSize:10.5, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--fg-faint)', fontWeight:500}}>Live log</h4>
          <div className="log">
            {[
              ["06:38.21", "cto", "received run_2031 · priority=high"],
              ["06:38.34", "cto", "triage → identity rotation · risk=medium"],
              ["06:38.41", "cto", "dispatch(arc, dvo, sec) in parallel"],
              ["06:39.02", "arc", "drafting plan · referenced lessons/idp.md#kid-skew"],
              ["06:40.20", "arc", "plan accepted (3 milestones)"],
              ["06:40.28", "cto", "dispatch(dev) · target=auth-gateway"],
              ["06:41.11", "dev", "patch keystore.go · +38 −12"],
              ["06:41.50", "dvo", "canary deploy: eu-west-1 @ 5%"],
              ["06:42.07", "sec", "blocked: vault.read on kv/prod/idp denied", true],
              ["06:42.18", "cto", "policy patch queued · ETA 90s"],
            ].map(([ts, who, msg, isErr], i) => (
              <div className="row" key={i}>
                <span className="ts">{ts}</span>
                <span className={"who " + who}>{who}</span>
                <span className="msg" style={isErr ? {color:'var(--status-blocked)'} : {}}>{msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentRunsTable({ onNav }) {
  const [rows, setRows] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    fetch("/api/runs", { credentials: "same-origin" })
      .then(res => res.ok ? res.json() : Promise.reject(new Error("HTTP " + res.status)))
      .then(data => {
        const mapped = (data.runs || []).map(r => ({
          id: r.id,
          title: r.title,
          status: r.status || "done",
          dur: r.files_changed != null ? (r.files_changed + " files") : "—",
          outcome: r.outcome || "—",
          target: null,
          prUrl: null,
        }));
        setRows(mapped);
      })
      .catch(err => setError(String(err.message || err)));
  }, []);

  // R7: validate PR URL starts with https://github.com/ before rendering as link
  function SafePrLink({ url }) {
    if (!url) return null;
    if (!url.startsWith('https://github.com/')) {
      return <span style={{color:'var(--fg-muted)', fontFamily:'var(--font-mono)', fontSize:11}}>{url}</span>;
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{color:'var(--accent)', display:'inline-flex', alignItems:'center', gap:4, fontSize:11.5}}
      >
        <span className="ico" style={{width:13, height:13}}>{Ico.pr}</span>PR
      </a>
    );
  }

  return (
    <div className="card">
      <div className="card-hdr">
        <span className="card-hdr-title">Recent runs</span>
        <span className="card-hdr-sub">all time</span>
        <div className="grow"/>
        <Btn kind="ghost sm" onClick={() => onNav?.('runs')}>All runs →</Btn>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{width:110}}>Run</th>
            <th>Requirement</th>
            <th style={{width:110}}>Status</th>
            <th style={{width:90}}>Duration</th>
            <th>Outcome</th>
            <th style={{width:90}}>Target</th>
            <th style={{width:50}}>PR</th>
          </tr>
        </thead>
        <tbody>
          {error && (
            <tr><td colSpan={7} style={{color:'var(--status-escalated)', padding:14}}>Failed to load runs: {error}</td></tr>
          )}
          {!error && rows === null && (
            <tr><td colSpan={7} style={{color:'var(--fg-muted)', padding:14}}>Loading runs…</td></tr>
          )}
          {!error && rows && rows.length === 0 && (
            <tr><td colSpan={7} style={{color:'var(--fg-muted)', padding:14}}>No runs recorded yet.</td></tr>
          )}
          {!error && rows && rows.map(r => (
            <tr key={r.id} onClick={() => onNav?.('run-detail', { runId: r.id })} style={{cursor:'pointer'}}>
              <td className="id">{r.id}</td>
              <td>{r.title}</td>
              <td><Pill kind={r.status}>{r.status}</Pill></td>
              <td className="mono">{r.dur}</td>
              <td style={{color:'var(--fg-muted)'}}>{r.outcome}</td>
              <td className="mono" style={{fontSize:11, color:'var(--fg-muted)'}}>{r.target || '—'}</td>
              <td><SafePrLink url={r.prUrl}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentHealthRow({ onNav }) {
  // run_a1b2c3d4: arc, sec, dev, qa participated; dvo was not dispatched
  const data = [
    { k: "cto", last: "2026-05-23", runs: 1, state: "done" },
    { k: "arc", last: "2026-05-23", runs: 1, state: "done" },
    { k: "dev", last: "2026-05-23", runs: 1, state: "done" },
    { k: "qa",  last: "2026-05-23", runs: 1, state: "done" },
    { k: "dvo", last: "—",         runs: 0, state: "pending" },
    { k: "sec", last: "2026-05-23", runs: 1, state: "done" },
  ];
  const dotColor = { done: "var(--status-done)", pending: "var(--status-pending)" };
  return (
    <div className="card">
      <div className="card-hdr">
        <span className="card-hdr-title">Agent health</span>
        <span className="card-hdr-sub">all time · runs dispatched</span>
        <div className="grow"/>
        <Btn kind="ghost sm" onClick={() => onNav?.('agents')}>Inspect →</Btn>
      </div>
      <div style={{padding:14}}>
        <div className="health-grid">
          {data.map(d => {
            const a = AGENTS.find(x => x.k === d.k);
            return (
              <div className="health-card" key={d.k}>
                <div className="row1">
                  <span className={"glyph" + (d.k === 'cto' ? ' cto' : '')}>{a.glyph}</span>
                  <span className="nm">{a.name}</span>
                  <span className="pdot" style={{background: dotColor[d.state]}}/>
                </div>
                <div className="last">last active · {d.last}</div>
                <div className="rate">
                  <span className="n">{d.runs} run{d.runs !== 1 ? 's' : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DashboardPage({ onNav }) {
  return (
    <AppShell
      active="dashboard" onNav={onNav}
      title="Dashboard"
      sub="Overview of orchestrator activity"
      actions={<Btn onClick={() => onNav?.('requirements')}>{Ico.plus} New requirement</Btn>}
    >
      <div className="main-body">
        <ActiveRunCard state="empty" onNav={onNav}/>
        <RecentRunsTable onNav={onNav}/>
        <AgentHealthRow onNav={onNav}/>
      </div>
    </AppShell>
  );
}

window.DashboardPage = DashboardPage;
