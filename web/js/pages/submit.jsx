// Submit Requirement page

function SubmitPage({ onNav }) {
  return (
    <AppShell
      active="requirements" onNav={onNav}
      crumb={<><span style={{cursor:'pointer'}} onClick={() => onNav?.('dashboard')}>Dashboard</span><span className="sep">/</span><span>Requirements</span><span className="sep">/</span><span className="cur">new</span></>}
      title="Submit requirement"
      sub="The CTO Agent will triage and dispatch sub-agents in parallel"
      actions={<>
        <Btn onClick={() => onNav?.('dashboard')}>Cancel</Btn>
        <Btn kind="primary" onClick={() => onNav?.('run-detail')}>Submit → dispatch CTO</Btn>
      </>}
    >
      <div className="main-body" style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:24, alignItems:'start'}}>
        <div className="card">
          <div className="card-hdr">
            <span className="card-hdr-title">New requirement</span>
            <span className="card-hdr-sub">req_drf · unsaved</span>
          </div>
          <div className="card-body">
            <form className="form" onSubmit={e => e.preventDefault()}>
              <div className="field">
                <label>Title</label>
                <input className="input" defaultValue="Add per-tenant audit log export to S3"/>
                <div className="hint">used for run lists, search, and the CTO's triage memo</div>
              </div>
              <div className="field">
                <label>Description</label>
                <textarea className="textarea" defaultValue={`We need each tenant's audit events streamed to their own prefix in s3://aitt-audit-prod/{tenant_id}/.

- Retention: 400 days, Glacier after 90
- Format: NDJSON, one event per line, schema v2
- Tenants opt in via /settings/audit (default: off)

QA must verify isolation: tenant A cannot read tenant B's objects via signed URL.`}/>
                <div className="hint">markdown supported · CTO will rewrite into a triage memo before dispatch</div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
                <div className="field">
                  <label>Priority</label>
                  <div className="seg" role="group">
                    <button type="button">low</button>
                    <button type="button" className="on">medium</button>
                    <button type="button">high</button>
                  </div>
                  <div className="hint">medium = same-day · high = preempts queue · low = batched overnight</div>
                </div>
                <div className="field">
                  <label>Source</label>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <input className="input" defaultValue="cli" readOnly style={{maxWidth:120, fontFamily:'var(--font-mono)'}}/>
                    <span className="tag">auto · from $ aitt submit</span>
                  </div>
                  <div className="hint">shown for transparency · the CTO logs source to runs.jsonl</div>
                </div>
              </div>
              <div className="field">
                <label>Touches (optional)</label>
                <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                  <Tag>repo: aitt/audit-pipeline</Tag>
                  <Tag>service: audit-worker</Tag>
                  <Tag>infra: s3, kinesis</Tag>
                  <Btn kind="ghost sm">+ add</Btn>
                </div>
                <div className="hint">used to scope Developer &amp; DevOps tool access</div>
              </div>
              <div className="field">
                <label>Constraints</label>
                <div style={{display:'flex', gap:14, flexWrap:'wrap'}}>
                  <label style={{display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'var(--fg-muted)'}}>
                    <input type="checkbox" defaultChecked/> require Security sign-off
                  </label>
                  <label style={{display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'var(--fg-muted)'}}>
                    <input type="checkbox" defaultChecked/> require QA pass before deploy
                  </label>
                  <label style={{display:'flex', alignItems:'center', gap:7, fontSize:12.5, color:'var(--fg-muted)'}}>
                    <input type="checkbox"/> escalate to human on diff &gt; 500 lines
                  </label>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          <div className="card">
            <div className="card-hdr"><span className="card-hdr-title">What happens next</span></div>
            <div className="card-body" style={{fontSize:12.5, color:'var(--fg-muted)', lineHeight:1.6}}>
              <ol style={{margin:0, paddingLeft:18, display:'flex', flexDirection:'column', gap:8}}>
                <li><span style={{color:'var(--fg)'}}>CTO triage.</span> Rewrites the requirement into a memo, sets risk &amp; SLA, picks the agent set.</li>
                <li><span style={{color:'var(--fg)'}}>Parallel dispatch.</span> Architect plans · DevOps reserves infra · Security drafts threat model.</li>
                <li><span style={{color:'var(--fg)'}}>Developer implements</span> against the Architect's plan.</li>
                <li><span style={{color:'var(--fg)'}}>QA verifies</span>, DevOps canaries, Security re-checks.</li>
                <li><span style={{color:'var(--fg)'}}>CTO reports.</span> Approved &amp; merged, or escalated to you with reason.</li>
              </ol>
            </div>
          </div>

          <div className="card">
            <div className="card-hdr">
              <span className="card-hdr-title">Predicted dispatch</span>
              <span className="card-hdr-sub">est by CTO model</span>
            </div>
            <div className="card-body" style={{padding:0}}>
              <table className="tbl">
                <thead><tr><th>Agent</th><th>Role</th><th>Est</th></tr></thead>
                <tbody>
                  {[
                    { k:"arc", role:"design s3 layout",       est:"2m" },
                    { k:"dev", role:"audit-worker patch",      est:"6m" },
                    { k:"dvo", role:"bucket + IAM",            est:"3m" },
                    { k:"qa",  role:"tenant-isolation tests",  est:"4m" },
                    { k:"sec", role:"cross-tenant audit",      est:"3m" },
                  ].map(r => (
                    <tr key={r.k}>
                      <td style={{display:'flex', alignItems:'center', gap:8}}><AgentGlyph k={r.k}/>{AGENTS.find(a=>a.k===r.k)?.name}</td>
                      <td className="mono">{r.role}</td>
                      <td className="mono">{r.est}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{display:'flex', gap:8, alignItems:'flex-start', padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border-subtle)', borderLeft:'2px solid var(--status-blocked)', borderRadius:6, color:'var(--fg-muted)', fontSize:12}}>
            <span style={{color:'var(--status-blocked)', marginTop:1}}>{Ico.warn}</span>
            <div>
              <div style={{color:'var(--fg)', fontWeight:500, marginBottom:2}}>This touches a billing service</div>
              Architect will likely propose a feature flag. CTO may require human approval before DevOps canary.
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

window.SubmitPage = SubmitPage;
