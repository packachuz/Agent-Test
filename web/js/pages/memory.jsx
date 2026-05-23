// Memory page

function MemoryPage({ onNav }) {
  const [activeTab, setActiveTab] = React.useState("roadmap");
  const [tocItem, setTocItem] = React.useState("H1");

  const tabs = [
    { k: "roadmap",   label: "Roadmap",   ct: 12 },
    { k: "decisions", label: "Decisions", ct: 118 },
    { k: "lessons",   label: "Lessons",   ct: 47 },
    { k: "skills",    label: "Skills",    ct: 23 },
    { k: "domain",    label: "Domain",    ct: 9 },
  ];

  const tocItems = [
    { id:"H1", seg:"seeded", label:"Quarterly objectives" },
    { id:"H2", seg:"seeded", label:"Compliance commitments" },
    { id:"H3", seg:"seeded", label:"Frozen surfaces" },
    { id:"H4", seg:"seeded", label:"Reserved infrastructure" },
    { id:"C1", seg:"cto",    label:"Active initiatives" },
    { id:"C2", seg:"cto",    label:"Tech debt register" },
    { id:"C3", seg:"cto",    label:"Recurring failures" },
    { id:"C4", seg:"cto",    label:"Service-of-the-week" },
    { id:"C5", seg:"cto",    label:"Cost watchlist" },
  ];

  return (
    <AppShell
      active="memory" onNav={onNav}
      title="Memory"
      sub="Persistent knowledge the CTO reads on every run"
      actions={<>
        <Btn>{Ico.download} Export all</Btn>
        <Btn kind="primary">{Ico.edit} Edit</Btn>
      </>}
      fullHeight
    >
      <div className="mem-tabs">
        {tabs.map(t => (
          <div key={t.k} className={"mem-tab" + (activeTab === t.k ? " active" : "")} onClick={() => setActiveTab(t.k)}>
            {t.label}<span className="ct">{t.ct}</span>
          </div>
        ))}
      </div>

      <div className="mem-layout">
        <aside className="mem-toc">
          <div style={{display:'flex', alignItems:'center', gap:8, padding:'4px 10px 10px'}}>
            <div className="seg" style={{flex:1}}>
              <button className="on">Both</button>
              <button>Seeded</button>
              <button>CTO</button>
            </div>
          </div>
          <div className="seg-label">Human-seeded</div>
          {tocItems.filter(i => i.seg === 'seeded').map(i => (
            <div key={i.id} className={"toc-item seeded" + (tocItem === i.id ? " active" : "")} onClick={() => setTocItem(i.id)}>
              <span className="pre">{i.id}</span> {i.label}
            </div>
          ))}
          <div className="seg-label" style={{marginTop:10}}>CTO-maintained</div>
          {tocItems.filter(i => i.seg === 'cto').map(i => (
            <div key={i.id} className={"toc-item cto" + (tocItem === i.id ? " active" : "")} onClick={() => setTocItem(i.id)}>
              <span className="pre">{i.id}</span> {i.label}
            </div>
          ))}
          <div style={{padding:'12px 10px', marginTop:'auto', fontFamily:'var(--font-mono)', fontSize:10.5, color:'var(--fg-faint)'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:3}}><span>memory/roadmap.md</span></div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:3}}><span>updated</span><span>2h ago</span></div>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:3}}><span>by</span><span>cto (run_9c3e)</span></div>
            <div style={{display:'flex', justifyContent:'space-between'}}><span>tokens</span><span>4,182</span></div>
          </div>
        </aside>

        <div className="mem-doc">
          <h1>Roadmap</h1>
          <div className="frontmatter">
            <span>file: memory/roadmap.md</span><span>·</span>
            <span>read by: cto, arc</span><span>·</span>
            <span>git: 0fa31bd</span>
          </div>

          <h2><span className="marker seeded">human-seeded</span>Quarterly objectives</h2>
          <div className="seeded-block">
            <p>Through Q3, the team optimises for <strong>reliability over feature throughput</strong>. Any run whose plan trades reliability for shipping speed must escalate to a human before execution.</p>
            <ul>
              <li>Ship per-tenant audit trails (req_1987 — in flight)</li>
              <li>Get p99 of <code>/search</code> under 280ms (regressed in May, see lessons/perf-may.md)</li>
              <li>Migrate auth from legacy <code>auth-gateway-v1</code> to <code>auth-gateway-v2</code> behind a flag</li>
              <li>Zero P0 security incidents for the quarter</li>
            </ul>
          </div>

          <h2><span className="marker seeded">human-seeded</span>Compliance commitments</h2>
          <div className="seeded-block">
            <p>The CTO must never approve a change that would violate:</p>
            <ul>
              <li>SOC2 CC6.1 — audit-log immutability (no rewrites, no shortening of retention)</li>
              <li>GDPR — no PII in non-EU storage without DPA review</li>
              <li>Internal: no production change without QA <em>and</em> Security pass between 22:00–06:00 UTC</li>
            </ul>
          </div>

          <div className="callout">
            <strong style={{color:'var(--fg)'}}>Boundary.</strong> Everything below this line is rewritten by the CTO after each run. Edits made here are diffed against the next CTO write — conflicts trigger a human escalation.
          </div>

          <h2><span className="marker cto">cto-maintained</span>Active initiatives</h2>
          <div className="cto-block">
            <ul>
              <li><strong>idp-rotation</strong> — req_2031, run_9c41, in progress. Dual-publish JWKS landed; canary at 50%. Blocking on jira-legacy JWKS cache TTL.</li>
              <li><strong>per-tenant-audit</strong> — req_1987, last touched 4 days ago. Architect waiting on legal review of cross-region transfer; CTO will nudge on Monday.</li>
              <li><strong>auth-v2-migration</strong> — req_1840, 11/14 services migrated. Holdouts: billing-worker, stripe-bridge, internal-dash.</li>
            </ul>
          </div>

          <h2><span className="marker cto">cto-maintained</span>Recurring failures</h2>
          <div className="cto-block">
            <p>Patterns the CTO has observed across the last 30 runs. Mentioned here so the Architect references them when drafting plans.</p>
            <ul>
              <li>JWKS caches in <code>jira-legacy</code>, <code>looker</code>, <code>hubspot-bridge</code> exceed 24h. Use a 36h skew window for any key rotation that touches them. <em>(noted from run_9c41)</em></li>
              <li>QA flake on <code>sso-smoke/google-workspace</code> when run within 60s of a deploy. Retry once before treating as failure.</li>
              <li>DevOps canaries to <code>ap-south-1</code> are 4× slower than other regions. Architect should budget accordingly.</li>
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

window.MemoryPage = MemoryPage;
