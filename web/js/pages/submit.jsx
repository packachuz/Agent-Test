// Submit Requirement page — triggers the CTO Run GitHub Actions workflow
// via the /api/trigger endpoint (which holds the GitHub PAT server-side).

function SubmitPage({ onNav }) {
  const [title, setTitle]             = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority]       = React.useState("medium");
  const [fixture, setFixture]         = React.useState("none");
  const [triggerKey, setTriggerKey]   = React.useState("");
  const [status, setStatus]           = React.useState("idle"); // idle|submitting|ok|error
  const [message, setMessage]         = React.useState("");

  const isFixture = fixture !== "none";

  async function submit() {
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority, fixture, trigger_key: triggerKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus("ok");
        setMessage("Workflow dispatched. The run appears in GitHub Actions and on the Runs page in ~1-2 min.");
      } else {
        setStatus("error");
        setMessage(data.error || ("HTTP " + res.status));
      }
    } catch (e) {
      setStatus("error");
      setMessage(String((e && e.message) || e));
    }
  }

  const canSubmit =
    triggerKey.trim() &&
    (isFixture || (title.trim() && description.trim())) &&
    status !== "submitting";

  return (
    <AppShell
      active="requirements" onNav={onNav}
      crumb={<>
        <span style={{cursor:'pointer'}} onClick={() => onNav?.('dashboard')}>Dashboard</span>
        <span className="sep">/</span><span className="cur">Submit</span>
      </>}
      title="Submit requirement"
      sub="Dispatches the CTO Run workflow on GitHub Actions"
    >
      <div className="main-body" style={{maxWidth:680}}>
        <div className="card">
          <div className="card-hdr">
            <span className="card-hdr-title">New run</span>
            <span className="card-hdr-sub">workflow_dispatch -> cto-run.yml</span>
          </div>
          <div className="card-body">
            <form className="form" onSubmit={e => { e.preventDefault(); if (canSubmit) submit(); }}>

              <div className="field">
                <label>Smoke-test fixture</label>
                <select className="input" value={fixture} onChange={e => setFixture(e.target.value)}>
                  <option value="none">none - real run (uses title/description)</option>
                  <option value="small-bugfix">small-bugfix</option>
                  <option value="high-severity-bug">high-severity-bug</option>
                </select>
                <div className="hint">Pick a fixture to smoke-test the loop without writing a requirement.</div>
              </div>

              <div className="field">
                <label>Title{!isFixture && " *"}</label>
                <input className="input" value={title} disabled={isFixture}
                       onChange={e => setTitle(e.target.value)}
                       placeholder={isFixture ? "(ignored for fixture runs)" : "e.g. Wire Agents page to /api/agents"} />
              </div>

              <div className="field">
                <label>Description{!isFixture && " *"}</label>
                <textarea className="textarea" value={description} disabled={isFixture}
                          onChange={e => setDescription(e.target.value)}
                          placeholder={isFixture ? "(ignored for fixture runs)" : "What needs doing and why"} />
              </div>

              <div className="field">
                <label>Priority</label>
                <div className="seg" role="group">
                  {["low","medium","high"].map(p => (
                    <button type="button" key={p} className={priority === p ? "on" : ""}
                            onClick={() => setPriority(p)}>{p}</button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Trigger key *</label>
                <input className="input" type="password" value={triggerKey}
                       onChange={e => setTriggerKey(e.target.value)}
                       placeholder="shared CTO_TRIGGER_KEY" />
                <div className="hint">Must match CTO_TRIGGER_KEY in Vercel env. The dashboard is public, so this gates who can spend.</div>
              </div>

              <div style={{display:'flex', gap:10, alignItems:'center'}}>
                <Btn kind="primary" onClick={() => canSubmit && submit()}>
                  {status === "submitting" ? "Dispatching..." : "Dispatch CTO Run"}
                </Btn>
                <Btn onClick={() => onNav?.('dashboard')}>Cancel</Btn>
              </div>

              {status === "ok" && (
                <div style={{marginTop:14, padding:'10px 12px', borderRadius:6,
                             background:'rgba(122,162,247,0.12)', color:'var(--status-done, #7aa2f7)', fontSize:13}}>
                  OK - {message}
                </div>
              )}
              {status === "error" && (
                <div style={{marginTop:14, padding:'10px 12px', borderRadius:6,
                             background:'rgba(255,107,123,0.12)', color:'var(--status-escalated, #ff6b7b)', fontSize:13, whiteSpace:'pre-wrap'}}>
                  Error - {message}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

window.SubmitPage = SubmitPage;
