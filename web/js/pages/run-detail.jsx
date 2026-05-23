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

function RunDetailPage({ onNav }) {
  return (
    <AppShell
      active="runs" onNav={onNav}
      crumb={<>
        <span style={{cursor:'pointer'}} onClick={() => onNav?.('dashboard')}>Dashboard</span>
        <span className="sep">/</span>
        <span style={{cursor:'pointer'}} onClick={() => onNav?.('runs')}>Runs</span>
        <span className="sep">/</span>
        <span className="cur">run_9c41</span>
      </>}
      title={<span>run_9c41 <span style={{color:'var(--fg-faint)', fontFamily:'var(--font-mono)', fontSize:13, marginLeft:8, fontWeight:400}}>· Rotate identity provider keys</span></span>}
      sub={<span>Started 14:32:18 · elapsed <span style={{color:'var(--fg)', fontFamily:'var(--font-mono)'}}>09:24</span> · priority high · 6 agents</span>}
      actions={<>
        <Btn>{Ico.download} JSONL log</Btn>
        <Btn>Open in CLI</Btn>
        <Btn kind="primary">Approve &amp; merge</Btn>
      </>}
    >
      <div className="main-body">
        {/* Requirement summary */}
        <div className="card">
          <div className="card-body" style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:18, padding:'14px 16px'}}>
            <div>
              <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:6, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--fg-faint)'}}>
                <span>req_2031</span><span>·</span><span>cli</span><span>·</span><span>opened by jm</span>
              </div>
              <h3 style={{margin:'0 0 4px', fontSize:14.5, fontWeight:600, letterSpacing:'-0.01em'}}>Rotate identity provider keys across prod &amp; staging</h3>
              <p style={{margin:0, color:'var(--fg-muted)', fontSize:12.5, lineHeight:1.55}}>
                Replace expiring OIDC signing keys, redeploy auth gateway, validate SSO for 14 downstream services. Constraint: zero-downtime, JWKS endpoint must serve both old and new <code style={{fontFamily:'var(--font-mono)', background:'var(--bg-card)', padding:'1px 5px', borderRadius:3, fontSize:11.5}}>kid</code> for 24h.
              </p>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'auto 1fr', gap:'6px 14px', alignSelf:'center', fontSize:12.5}}>
              <span style={{color:'var(--fg-faint)'}}>SLA</span><span><Tag>2h budget · 23m used</Tag></span>
              <span style={{color:'var(--fg-faint)'}}>Risk</span><span><Pill kind="blocked">medium</Pill></span>
              <span style={{color:'var(--fg-faint)'}}>Status</span><span><Pill kind="running">in progress · phase 3/4</Pill></span>
              <span style={{color:'var(--fg-faint)'}}>Cost</span><span className="mono" style={{color:'var(--fg-muted)'}}>$0.41 · 184k tokens</span>
              <span style={{color:'var(--fg-faint)'}}>Target</span>
              <span style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap'}}>
                {(() => {
                  const repoUrl = null; // set to "https://github.com/org/repo"
                  const prUrl   = null; // set to "https://github.com/org/repo/pull/N"
                  const branch  = null; // set to "feat/run_xxx-slug"
                  if (!repoUrl) return <span style={{color:'var(--fg-muted)'}}>—</span>;
                  const safeRepo = repoUrl.startsWith('https://github.com/') ? repoUrl : null;
                  const safePr   = prUrl && prUrl.startsWith('https://github.com/') ? prUrl : null;
                  const label    = safeRepo ? safeRepo.replace('https://github.com/', '') : repoUrl;
                  return (
                    <>
                      {safeRepo
                        ? <a href={safeRepo} target="_blank" rel="noopener noreferrer"
                             style={{color:'var(--accent)', display:'inline-flex', alignItems:'center', gap:4}}>
                            <span className="ico" style={{width:13,height:13}}>{Ico.github}</span>
                            <span className="mono" style={{fontSize:11}}>{label}</span>
                          </a>
                        : <span className="mono" style={{fontSize:11, color:'var(--fg-muted)'}}>{label}</span>
                      }
                      {branch && <span className="mono" style={{fontSize:11, color:'var(--fg-muted)'}}>· {branch}</span>}
                      {safePr &&
                        <a href={safePr} target="_blank" rel="noopener noreferrer"
                           style={{color:'var(--status-done)', display:'inline-flex', alignItems:'center', gap:4}}>
                          <span className="ico" style={{width:12,height:12}}>{Ico.pr}</span>
                          <span className="mono" style={{fontSize:11}}>PR</span>
                        </a>
                      }
                    </>
                  );
                })()}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline hero */}
        <div>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
            <h2 style={{margin:0, fontSize:13, fontWeight:600, letterSpacing:'-0.005em'}}>Agent timeline</h2>
            <span style={{fontFamily:'var(--font-mono)', fontSize:11, color:'var(--fg-faint)'}}>0:00 → 12:00 · 1m / column</span>
            <div style={{flex:1}}/>
            <div style={{display:'flex', gap:10, fontSize:11.5, color:'var(--fg-muted)', alignItems:'center'}}>
              {[["running","running"],["done","done"],["blocked","blocked"],["pending","pending"],["escalated","escalated"]].map(([s,l]) => (
                <span key={s} style={{display:'inline-flex', alignItems:'center', gap:5}}>
                  <span style={{width:9, height:9, borderRadius:2, background:`var(--status-${s}-soft)`, border:`1px solid var(--status-${s})`}}/>
                  {l}
                </span>
              ))}
            </div>
          </div>
          <Timeline/>
        </div>

        {/* Trace log */}
        <div className="card">
          <div className="card-hdr">
            <span className="card-hdr-title">Trace</span>
            <span className="card-hdr-sub">42 entries · click to expand</span>
            <div className="grow"/>
            <div className="seg">
              <button className="on">all</button>
              <button>cto</button>
              <button>tools</button>
              <button>errors</button>
            </div>
          </div>
          <div className="logtree">
            <LogEntry ts="0:00.21" whoKey="cto" whoLabel="cto" what={<>triage(<span className="arg">"rotate idp keys…"</span>)</>} dur="0.4s"/>
            <LogEntry ts="0:00.62" whoKey="cto" whoLabel="cto" what={<>reflect → risk=<span className="arg">medium</span>, agents=<span className="arg">[arc, dev, qa, dvo, sec]</span></>} dur="0.9s"/>
            <LogEntry ts="0:01.55" whoKey="arc" whoLabel="arc"
              what={<>plan.draft(<span className="arg">memory: lessons/idp.md#kid-skew</span>)</>}
              dur="1m 18s"
              detail={[
                ["input",      "Triage memo from CTO + 3 referenced ADRs. Goal: zero-downtime rotation across 14 SSO consumers."],
                ["output",     "Plan — Milestone 1: dual-publish JWKS · M2: rotate signer · M3: garbage-collect old kid after 24h.\nADRs created: adr-0118-jwks-dual-publish.md, adr-0119-kid-skew-window.md"],
                ["reflection", "Considered single-cutover (rejected: 14 consumers w/ unknown jwks cache). Considered 48h skew (rejected: violates SOC2 control). 24h matches lessons/idp.md guidance."],
                ["retries",    "0"],
              ]}
            />
            <LogEntry ts="0:02.30" whoKey="dvo" whoLabel="dvo" what={<>infra.canary(<span className="arg">service: auth-gateway, region: eu-west-1, pct: 5</span>)</>} dur="2m 04s"/>
            <LogEntry ts="0:05.11" whoKey="dev" whoLabel="dev"
              what={<>patch(<span className="arg">auth-gateway/keystore.go</span>) → +38 −12</>}
              dur="3m 22s"
              detail={[
                ["input",      "Architect plan, file: auth-gateway/keystore.go (current sha b1f29ab)"],
                ["diff", (<div>
                  <div style={{color:'var(--fg-faint)'}}>{"@@ -41,7 +41,17 @@ func (k *Store) Active() *Key {"}</div>
                  <div style={{color:'var(--status-escalated)'}}>{"- return k.current"}</div>
                  <div style={{color:'var(--status-done)'}}>{"+ // dual-publish window: serve both during rotation"}</div>
                  <div style={{color:'var(--status-done)'}}>{"+ if k.rotating && time.Since(k.rotatedAt) < rotationWindow {"}</div>
                  <div style={{color:'var(--status-done)'}}>{"+   return k.current"}</div>
                  <div style={{color:'var(--status-done)'}}>{"+ }"}</div>
                  <div style={{color:'var(--status-done)'}}>{"+ return k.next"}</div>
                  <div style={{color:'var(--fg-faint)'}}>{"}"}</div>
                </div>), "code"],
                ["reflection", "Considered exposing kid list via /jwks (matches plan M1). Did not delete old key path — needed for 24h skew."],
                ["retries",    "1 (first attempt: forgot mutex on rotatedAt; QA static-check caught it)"],
              ]}
            />
            <LogEntry ts="0:06.40" whoKey="sec" whoLabel="sec" what={<>vault.read(<span className="arg">kv/prod/idp/signing</span>) → <span style={{color:'var(--status-blocked)'}}>permission denied</span></>} dur="0.2s"/>
            <LogEntry ts="0:06.55" whoKey="cto" whoLabel="cto" what={<>policy.patch(<span className="arg">vault, role: sec-agent, path: kv/prod/idp/*</span>) → queued</>} dur="1.4s"/>
            <LogEntry ts="0:08.12" whoKey="qa" whoLabel="qa" what={<>sso-smoke(<span className="arg">consumers: 14, env: eu-west-1-canary</span>) → 11/14 pass</>} dur="2m 09s"/>
          </div>
        </div>

        {/* CTO decision */}
        <div className="card" style={{borderColor:'var(--border)'}}>
          <div className="card-hdr">
            <span className="card-hdr-title">CTO decision</span>
            <span className="card-hdr-sub">pending · awaiting QA + Security</span>
            <div className="grow"/>
            <Pill kind="running">drafting</Pill>
          </div>
          <div className="card-body" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:18}}>
            <div>
              <div style={{fontSize:10.5, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--fg-faint)', marginBottom:8}}>Anticipated outcome</div>
              <div style={{fontSize:13.5, fontWeight:500, marginBottom:6}}>Approve &amp; merge after QA pass</div>
              <p style={{color:'var(--fg-muted)', fontSize:12.5, lineHeight:1.6, margin:0}}>
                The patch matches Architect's plan and lessons/idp.md guidance. 3 SSO consumers failed smoke (jira-legacy, looker, hubspot-bridge) — all use cached JWKS &gt; 24h. CTO will instruct DevOps to extend skew window to 36h before approving.
              </p>
              <div style={{display:'flex', gap:8, marginTop:14}}>
                <Btn>Override → escalate to human</Btn>
                <Btn kind="primary">Approve early</Btn>
              </div>
            </div>
            <div>
              <div style={{fontSize:10.5, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--fg-faint)', marginBottom:8}}>Diff summary</div>
              <div style={{background:'var(--bg-sunken)', border:'1px solid var(--border-subtle)', borderRadius:6, padding:'10px 12px', fontFamily:'var(--font-mono)', fontSize:11.5, lineHeight:1.6, color:'var(--fg-muted)'}}>
                <div><span style={{color:'var(--fg)'}}>4 files</span> changed · <span style={{color:'var(--status-done)'}}>+167</span> <span style={{color:'var(--status-escalated)'}}>−14</span></div>
                <div style={{marginTop:6}}>auth-gateway/keystore.go <span style={{color:'var(--status-done)'}}>+38</span> <span style={{color:'var(--status-escalated)'}}>−12</span></div>
                <div>auth-gateway/keystore_test.go <span style={{color:'var(--status-done)'}}>+112</span></div>
                <div>infra/vault/policies/sec-agent.hcl <span style={{color:'var(--status-done)'}}>+11</span> <span style={{color:'var(--status-escalated)'}}>−2</span></div>
                <div>docs/adr/0118-jwks-dual-publish.md <span style={{color:'var(--status-done)'}}>+6</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

window.RunDetailPage = RunDetailPage;
