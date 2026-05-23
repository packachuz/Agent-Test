// Shared chrome + primitives

const Ico = {
  dash:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="2" width="5" height="6" rx="1"/><rect x="9" y="2" width="5" height="4" rx="1"/><rect x="9" y="8" width="5" height="6" rx="1"/><rect x="2" y="10" width="5" height="4" rx="1"/></svg>,
  req:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 2.5h7l3 3V13a.5.5 0 0 1-.5.5h-9.5A.5.5 0 0 1 2.5 13V3a.5.5 0 0 1 .5-.5Z"/><path d="M9.5 2.5V6h3.5"/><path d="M5 9h6M5 11.5h4"/></svg>,
  agents:  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="5" r="2.2"/><path d="M3 14c.5-2.6 2.6-4 5-4s4.5 1.4 5 4"/></svg>,
  mem:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><ellipse cx="8" cy="3.5" rx="5" ry="1.6"/><path d="M3 3.5v9c0 .9 2.2 1.7 5 1.7s5-.8 5-1.7v-9"/><path d="M3 8c0 .9 2.2 1.7 5 1.7S13 8.9 13 8"/></svg>,
  runs:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 8h2l1.5-4 3 8 1.5-4H13"/></svg>,
  settings:<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="2"/><path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8 3.4 3.4"/></svg>,
  plus:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3v10M3 8h10"/></svg>,
  search:  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="4.5"/><path d="m13 13-2.7-2.7"/></svg>,
  download:<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 2v8m0 0 3-3M8 10 5 7M3 13h10"/></svg>,
  edit:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M11.5 2.5 13.5 4.5 5 13l-3 .5.5-3z"/></svg>,
  more:    <svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="12.5" cy="8" r="1"/></svg>,
  warn:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 2 2 13.5h12z"/><path d="M8 6.5v3.5M8 12v.5"/></svg>,
  spin:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 2a6 6 0 1 1-5.2 9" strokeLinecap="round"/></svg>,
  inbox:   <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 9h2.5l1 2h3l1-2H13"/><path d="m4 3 1 6h6l1-6z"/><path d="M2.5 9v3.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V9"/></svg>,
  chev:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 4 4 4-4 4"/></svg>,
  back:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m10 4-4 4 4 4"/></svg>,
};

const AGENTS = [
  { k: "cto", name: "CTO",       glyph: "Ω",   model: "opus",   role: "Lead orchestrator", color: "var(--accent)" },
  { k: "arc", name: "Architect", glyph: "△",   model: "opus",   role: "System design",     color: "var(--status-running)" },
  { k: "dev", name: "Developer", glyph: "</>", model: "sonnet", role: "Implementation",    color: "var(--status-done)" },
  { k: "qa",  name: "QA",        glyph: "✓",   model: "sonnet", role: "Verification",      color: "var(--status-blocked)" },
  { k: "dvo", name: "DevOps",    glyph: "∞",   model: "sonnet", role: "Deploy & infra",    color: "oklch(0.78 0.14 180)" },
  { k: "sec", name: "Security",  glyph: "⌬",   model: "opus",   role: "Threat review",     color: "var(--status-escalated)" },
];

function AgentGlyph({ k }) {
  const a = AGENTS.find(x => x.k === k);
  return <span className={"agent-glyph" + (k === 'cto' ? ' cto' : '')}>{a?.glyph || '?'}</span>;
}

function Pill({ kind, children }) {
  return <span className={"pill " + kind}><span className="pdot"/>{children}</span>;
}

function Tag({ children }) { return <span className="tag">{children}</span>; }

function Btn({ kind = "", children, onClick, style }) {
  return <button className={"btn " + kind} onClick={onClick} style={style}>{children}</button>;
}

function Header({ crumb, status = "online" }) {
  return (
    <header className="hdr">
      <div className="hdr-brand">
        <div className="hdr-logo">AI</div>
        <span>Agent IT Team</span>
      </div>
      <div className="hdr-divider"/>
      {crumb
        ? <div className="hdr-crumb">{crumb}</div>
        : <div className="hdr-crumb"><span>infra.eng</span><span className="sep">/</span><span>prod</span></div>
      }
      <div className="hdr-right">
        <div className="hdr-kbd"><kbd>⌘</kbd><kbd>K</kbd> jump to</div>
        <div className={"hdr-status" + (status === 'offline' ? ' offline' : '')}>
          <span className="dot"/>
          <span>{status === 'offline' ? 'System offline' : 'System online · 6 agents'}</span>
        </div>
        <div className="hdr-avatar">JM</div>
      </div>
    </header>
  );
}

function Sidebar({ active, onNav }) {
  const items = [
    { k: "dashboard",    icon: Ico.dash,     label: "Dashboard",    count: null },
    { k: "requirements", icon: Ico.req,      label: "Requirements", count: "12" },
    { k: "agents",       icon: Ico.agents,   label: "Agents",       count: "6" },
    { k: "memory",       icon: Ico.mem,      label: "Memory",       count: null },
    { k: "runs",         icon: Ico.runs,     label: "Runs",         count: "284" },
    { k: "settings",     icon: Ico.settings, label: "Settings",     count: null },
  ];
  return (
    <aside className="side">
      <div className="side-section">
        <div className="side-label">Workspace</div>
        {items.map(it => (
          <div
            key={it.k}
            className={"side-item" + (active === it.k ? " active" : "")}
            onClick={() => onNav?.(it.k)}
            style={{cursor: 'pointer'}}
          >
            <span className="ico">{it.icon}</span>
            <span>{it.label}</span>
            {it.count && <span className="count">{it.count}</span>}
          </div>
        ))}
      </div>
      <div className="side-section">
        <div className="side-label">Pinned runs</div>
        <div className="side-item" onClick={() => onNav?.('run-detail')} style={{cursor:'pointer'}}>
          <span className="ico" style={{color:'var(--status-done)'}}>●</span>
          <span style={{fontFamily:'var(--font-mono)', fontSize:11.5}}>run_9c41 · idp-rotate</span>
        </div>
        <div className="side-item" style={{cursor:'pointer'}}>
          <span className="ico" style={{color:'var(--status-blocked)'}}>●</span>
          <span style={{fontFamily:'var(--font-mono)', fontSize:11.5}}>run_8e91 · k8s-migrate</span>
        </div>
      </div>
      <div className="side-foot">
        <div className="row"><span>orchestrator</span><span>v0.4.2</span></div>
        <div className="row"><span>queue</span><span>0 / 4</span></div>
        <div className="row"><span>budget</span><span>$2.18 / $50</span></div>
      </div>
    </aside>
  );
}

function AppShell({ active, crumb, title, sub, actions, children, onNav, status = "online", fullHeight = false }) {
  return (
    <div className="app" style={fullHeight ? {height:'100vh'} : {}}>
      <Header crumb={crumb} status={status}/>
      <Sidebar active={active} onNav={onNav}/>
      <main className="main">
        <div className="main-bar">
          <div>
            <div className="main-title">{title}</div>
            {sub && <div className="main-sub">{sub}</div>}
          </div>
          <div className="grow"/>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

window._shared = { Ico, AGENTS, AgentGlyph, Pill, Tag, Btn, Header, Sidebar, AppShell };
Object.assign(window, window._shared);
