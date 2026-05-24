// Run Detail page — hero is the agent timeline

function Timeline() {
  const lanes = [
    { k: "cto", blocks: [
      { l: 0,  w: 3,  s: "done",    t: "triage",          m: "0:00–0:42" },
      { l: 3,  w: 4,  s: "done",    t: "dispatch ×3",     m: "→ arc, dvo, sec" },
      { l: 24, w: 5,  s: "done",    t: "dispatch dev",    m: "post-plan" },
      { l: 78, w: 8,  s: "running", t: "synthesize",      m: "awaiting qa+sec" },
    ]},
    { k: "arc", blocks: [
      { l: 7,  w: 17, s: "done",    t: "draft plan",      m: "3 milestones · 2 ADRs" },
      { l: 60, w: 6,  s: "done",    t: "review patch",    m: "+38 −12" },
    ]},
    { k: "dev", blocks: [
      { l: 30, w: 28, s: "done",    t: "patch keystore.go", m: "+38 −12" },
      { l: 58, w: 7,  s: "done",    t: "patch tests",     m: "+112 −0" },
    ]},
    { k: "qa", blocks: [
      { l: 30, w: 24, s: "pending", t: "wait dev",        m: "" },
      { l: 65, w: 21, s: "running", t: "sso-smoke × 14",  m: "11/14 passed" },
    ]},
    { k: "dvo", blocks: [
      { l: 7,  w: 14, s: "done",    t: "stage canary",    m: "5% eu-west-1" },
      { l: 65, w: 12, s: "running", t: "canary 50%",      m: "watching p99" },
    ]},
    { k: "sec", blocks: [
      { l: 7,  w: 18, s: "done",    t: "threat model",    m: "kid-skew risk noted" },
      { l: 60, w: 8,  s: "blocked", t: "vault.read denied", m: "waiting policy" },
      { l: 68, w: 12, s: "running", t: "token-replay scan", m: "after policy ok" },
    ]},
  ];

  return (
    <div className="timeline">
      <div className="timeline-hdr">
        <div className="lane-label">agent ↓ · time →</div>
        <div className="ticks">
          {Array.from({length: 12}, (_, i) => (
            <div key={i} className="tick">{String(i).padStart(2,'0')}:00</div>
          ))}
        </div>
      </div>
      {lanes.map(lane => {
        const a = AGENTS.find(x => x.k === lane.k);
        return (
          <div className="timeline-lane" key={lane.k}>
            <div className="lane-name">
              <div className="ln"><AgentGlyph k={lane.k}/> {a.name}</div>
              <div className="lm">{a.model}</div>
            </div>
            <div className="timeline-track">
              {lane.blocks.map((b, i) => (
                <div key={i} className={"tl-block " + b.s} style={{left: b.l + '%', width: b.w + '%'}}>
                  <div className="tl-title">{b.t}</div>
                  {b.m && <div className="tl-meta">{b.m}</div>}
                </div>
              ))}
              <div className="tl-now" style={{left: '78%'}}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogEntry({ ts, whoKey, whoLabel, what, dur, detail }) {
  const [expanded, setExpanded] = React.useState(false);
  const whoColors = { cto:"var(--accent)", arc:"var(--status-running)", dev:"var(--status-done)", qa:"var(--status-blocked)", dvo:"oklch(0.78 0.14 180)", sec:"var(--status-escalated)" };
  return (
    <>
      <div className={"lt-entry" + (expanded ? " expanded" : "")} onClick={() => detail && setExpanded(e => !e)} style={detail ? {cursor:'pointer'} : {}}>
        <span className="chev">{detail ? (expanded ? '▾' : '▸') : ' '}</span>
        <span className="ts">{ts}</span>
        <span className="who" style={{color: whoColors[whoKey] || 'var(--fg-muted)'}}>{whoLabel}</span>
        <span className="what">{what}</span>
        <span className="dur">{dur}</span>
      </div>
      {expanded && detail && (
        <div className="lt-detail">
          {detail.map(([k, v, cls], i) => (
            <React.Fragment key={i}>
              <div className="k">{k}</div>
              <div className={"v " + (cls || '')}>{v}</div>
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  );
}

function RunsListView({ onNav }) {
  const [rows, setRows]   = React.useState(null);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    fetch("/api/runs", { credentials: "same-origin" })
      .then(res => res.ok ? res.json() : Promise.reject(new Error("HTTP " + res.status)))
      .then(d => setRows(d.runs || []))
      .catch(e => setError(String(e.message || e)));
  }, []);
  return (
    <AppShell active="runs" onNav={onNav} title="Runs" sub="all recorded runs">
      <div className="main-body">
        <div className="card">
          <div className="card-hdr">
            <span className="card-hdr-title">All runs</span>
            <span className="card-hdr-sub">{rows ? rows.length : '…'}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{width:130}}>Run</th>
                <th>Requirement</th>
                <th style={{width:120}}>Outcome</th>
                <th style={{width:90}}>Files</th>
              </tr>
            </thead>
            <tbody>
              {error && <tr><td colSpan={4} style={{color:'var(--status-escalated)', padding:14}}>Failed to load: {error}</td></tr>}
              {!error && rows === null && <tr><td colSpan={4} style={{color:'var(--fg-muted)', padding:14}}>Loading…</td></tr>}
              {!error && rows && rows.length === 0 && <tr><td colSpan={4} style={{color:'var(--fg-muted)', padding:14}}>No runs recorded.</td></tr>}
              {!error && rows && rows.map(r => (
                <tr key={r.id} onClick={() => onNav?.('run-detail', { runId: r.id })} style={{cursor:'pointer'}}>
                  <td className="id">{r.id}</td>
                  <td>{r.title}</td>
                  <td style={{color:'var(--fg-muted)'}}>{r.outcome || '—'}</td>
                  <td className="mono">{r.files_changed != null ? r.files_changed : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function RunDetailPage({ onNav, runId }) {
  const [data, setData]   = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!runId) return;
    setData(null); setError(null);
    fetch("/api/runs/" + encodeURIComponent(runId), { credentials: "same-origin" })
      .then(res => {
        if (!res.ok) return Promise.reject(new Error("HTTP " + res.status));
        return res.json();
      })
      .then(setData)
      .catch(err => setError(String(err.message || err)));
  }, [runId]);

  if (!runId) return <RunsListView onNav={onNav}/>;

  if (error) {
    return (
      <AppShell active="runs" onNav={onNav} title="Run not found" sub={runId}>
        <div className="main-body">
          <div className="card"><div style={{padding:14, color:'var(--status-escalated)'}}>Failed to load run: {error}</div></div>
        </div>
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell active="runs" onNav={onNav} title="Loading…" sub={runId || ""}>
        <div className="main-body">
          <div className="card"><div style={{padding:14, color:'var(--fg-muted)'}}>Loading run…</div></div>
        </div>
      </AppShell>
    );
  }

  const { summary, events } = data;
  const filesList = summary.files_changed || [];

  return (
    <AppShell
      active="runs" onNav={onNav}
      crumb={<>
        <span style={{cursor:'pointer'}} onClick={() => onNav?.('dashboard')}>Dashboard</span>
        <span className="sep">/</span>
        <span className="cur">{summary.id}</span>
      </>}
      title={<span>{summary.id} <span style={{color:'var(--fg-faint)', fontFamily:'var(--font-mono)', fontSize:13, marginLeft:8, fontWeight:400}}>· {summary.title}</span></span>}
      sub={<span>{summary.received_at || "—"} · priority {summary.priority || "—"} · {events.length} event{events.length !== 1 ? 's' : ''}</span>}
    >
      <div className="main-body">
        {/* Requirement summary */}
        <div className="card">
          <div className="card-body" style={{padding:'14px 16px'}}>
            <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:6, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--fg-faint)'}}>
              <span>{summary.id}</span>
              {summary.decision && <><span>·</span><span>decision: {summary.decision}</span></>}
              {summary.outcome && <><span>·</span><span>outcome: {summary.outcome}</span></>}
            </div>
            <h3 style={{margin:'0 0 6px', fontSize:14.5, fontWeight:600, letterSpacing:'-0.01em'}}>{summary.title}</h3>
            {summary.description && (
              <p style={{margin:0, color:'var(--fg-muted)', fontSize:12.5, lineHeight:1.55}}>{summary.description}</p>
            )}
          </div>
        </div>

        {/* Files changed */}
        {filesList.length > 0 && (
          <div className="card">
            <div className="card-hdr">
              <span className="card-hdr-title">Files changed</span>
              <span className="card-hdr-sub">{filesList.length} file{filesList.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{padding:'10px 16px 14px', fontFamily:'var(--font-mono)', fontSize:11.5, lineHeight:1.7, color:'var(--fg-muted)'}}>
              {filesList.map(f => <div key={f}>{f}</div>)}
            </div>
          </div>
        )}

        {/* Event timeline (real JSONL) */}
        <div className="card">
          <div className="card-hdr">
            <span className="card-hdr-title">Events</span>
            <span className="card-hdr-sub">from runs/{summary.id}.jsonl</span>
          </div>
          <div style={{padding:'10px 16px 14px', fontFamily:'var(--font-mono)', fontSize:11.5, lineHeight:1.7}}>
            {events.length === 0 && (
              <div style={{color:'var(--fg-muted)'}}>No events recorded.</div>
            )}
            {events.map((e, i) => {
              const ts = e.timestamp || (e.timestamps && (e.timestamps.received || e.timestamps.completed)) || "";
              const agent = e.agent || (e.requirement ? "intake" : "—");
              const action = e.action || (e.requirement ? "submit" : e.decision ? ("decision: " + e.decision) : "—");
              return (
                <div key={i} style={{display:'grid', gridTemplateColumns:'160px 70px 1fr', gap:10, padding:'2px 0', borderBottom:'1px solid var(--border-faint, rgba(127,127,127,0.08))'}}>
                  <span style={{color:'var(--fg-faint)'}}>{ts}</span>
                  <span style={{color:'var(--accent)'}}>{agent}</span>
                  <span style={{color:'var(--fg)'}}>{action}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

window.RunDetailPage = RunDetailPage;
