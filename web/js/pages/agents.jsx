// Agents page

const AGENT_DATA = [
  {
    k: "cto", role: "Lead orchestrator · only agent that talks to humans",
    desc: "Receives requirements, rewrites them into triage memos, picks the agent set, dispatches in parallel, synthesizes results, and decides approve / escalate. Reads all of memory before every run.",
    tools: ["read.memory","write.memory","agents.dispatch","policy.patch","human.notify","git.merge"],
    runs: "284", dur: "11m 04s", rate: "98.2%",
    prompt: `You are the CTO Agent — the orchestrator of the Agent IT Team.

On every run you will:
1. Read memory/ entirely before acting.
2. Triage the incoming requirement against memory/roadmap.md.
3. Decompose into task groups and dispatch sub-agents in parallel where possible.
4. Synthesize their results and decide: approve (self-merge if policy allows) or escalate to human.
5. Append the outcome to memory/decisions.md and update memory/roadmap.md.

You are the ONLY agent that speaks to the human. Sub-agents report to you; you report to the human.

Never approve a change that violates memory/domain.md constraints. When in doubt, escalate.`
  },
  {
    k: "arc", role: "System design",
    desc: "Turns a triage memo into an implementation plan with milestones, risks, and one or more ADRs. Tries 2–3 alternatives in scratch space before committing; rejected alternatives are kept as ADR appendix.",
    tools: ["read.repo","read.memory","search.adr","draw.diagram","memory.append:decisions"],
    runs: "241", dur: "2m 38s", rate: "94.1%",
    prompt: `You are the Architect Agent. You receive a triage memo from the CTO and produce an implementation plan.

Always:
- Read memory/lessons.md and memory/decisions.md before drafting.
- Try 2–3 design alternatives before choosing one.
- Produce at minimum: a plan with milestones, an ADR for each significant choice.
- Flag anything that touches frozen surfaces (see memory/domain.md).

Report DONE only when your plan is complete and unambiguous enough for the Developer to implement without asking questions.`
  },
  {
    k: "dev", role: "Implementation",
    desc: "Writes the actual diff against the Architect's plan. Always runs the project's pre-commit and unit tests before declaring done. Limited to files in the requirement's 'touches' tags unless CTO grants expansion.",
    tools: ["read.repo","edit.repo","shell:test","shell:lint","git.branch","git.commit"],
    runs: "262", dur: "4m 51s", rate: "91.7%",
    prompt: `You are the Developer Agent. You implement exactly what the Architect's plan specifies.

Rules:
- Only touch files listed in the requirement's 'touches' scope, or files the Architect's plan explicitly names.
- Run lint and tests before reporting DONE. If tests fail, replan and retry (max 3 attempts).
- If the plan is ambiguous, do not guess — report BLOCKED with a specific question for the Architect.
- Code is ephemeral. If your first attempt is wrong, discard and rewrite from scratch.`
  },
  {
    k: "qa", role: "Verification · adversarial",
    desc: "Runs the full test suite, plus targeted smoke tests derived from the requirement. Authoritatively decides 'works' or 'doesn't' — the CTO never overrides a QA fail without a human signing off.",
    tools: ["shell:test","shell:e2e","browser.synthetic","snapshot.compare","read.repo"],
    runs: "247", dur: "3m 12s", rate: "88.4%",
    prompt: `You are the QA Agent. Your verdict is final — the CTO cannot override a QA fail without human approval.

On every task:
1. Run the full existing test suite.
2. Write targeted tests specific to this requirement's success criteria.
3. Test adversarially: try to break isolation boundaries, trigger edge cases the Developer may have missed.
4. If a test is flaky (see memory/lessons.md for known flakes), retry once before failing.

Report DONE only when all tests pass, including yours.`
  },
  {
    k: "dvo", role: "Deploy & infra",
    desc: "Owns canary rollouts, infra-as-code edits, secrets, and rollback. Refuses to deploy if QA hasn't passed in the last 10 minutes against the same commit.",
    tools: ["read.repo","edit.tf","k8s.apply","vault.write","deploy.canary","deploy.rollback"],
    runs: "198", dur: "3m 47s", rate: "96.0%",
    prompt: `You are the DevOps Agent. You own deployments and infrastructure.

Hard rules:
- Never deploy unless QA has passed against the exact same commit within the last 10 minutes.
- Always canary (5% → 50% → 100%) unless the CTO explicitly authorises direct deploy.
- On any error metric spike during canary: stop and report BLOCKED immediately, do not self-heal.
- Rollback is always available — prefer it over debugging in prod.`
  },
  {
    k: "sec", role: "Threat review",
    desc: "Drafts a threat model from the requirement, audits the Developer's diff for OWASP and internal anti-patterns, and signs off (or doesn't) on the DevOps canary. Has authority to block any release.",
    tools: ["read.repo","read.vault","scan.semgrep","scan.trivy","memory.append:lessons","release.block"],
    runs: "184", dur: "2m 22s", rate: "82.5%",
    prompt: `You are the Security Agent. You have blocking authority — any agent can be stopped by your veto.

On every task:
1. Draft a threat model (STRIDE) for the requirement.
2. Audit the Developer's diff against OWASP Top 10 and memory/domain.md security policies.
3. Run semgrep and trivy on changed files.
4. Sign off only when all findings are resolved or accepted (with documented risk).

If you find a P0 issue, report BLOCKED to CTO immediately with full details.`
  },
];

function AgentModal({ agent, onClose }) {
  const a = AGENTS.find(x => x.k === agent.k);
  return (
    <div style={{position:'fixed', inset:0, background:'oklch(0 0 0 / 0.6)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:10, width:640, maxHeight:'80vh', overflow:'auto', padding:24}} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex', alignItems:'flex-start', gap:14, marginBottom:18}}>
          <span className={"glyph" + (agent.k === 'cto' ? ' cto' : '')} style={{width:40, height:40, borderRadius:8, display:'grid', placeItems:'center', fontFamily:'var(--font-mono)', fontSize:16, fontWeight:600, background: agent.k === 'cto' ? 'var(--accent-soft)' : 'var(--bg-card)', color: agent.k === 'cto' ? 'var(--accent)' : 'var(--fg)', border: agent.k === 'cto' ? 'none' : '1px solid var(--border-subtle)'}}>{a.glyph}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:16, fontWeight:600}}>{a.name}</div>
            <div style={{fontSize:12, color:'var(--fg-muted)'}}>{agent.role}</div>
          </div>
          <Tag>{a.model}</Tag>
          <Btn kind="ghost sm" onClick={onClose}>✕</Btn>
        </div>
        <div style={{fontSize:10.5, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--fg-faint)', marginBottom:8}}>System prompt</div>
        <pre style={{fontFamily:'var(--font-mono)', fontSize:12, lineHeight:1.6, color:'var(--fg-muted)', background:'var(--bg-sunken)', border:'1px solid var(--border-subtle)', borderRadius:6, padding:'12px 14px', margin:0, whiteSpace:'pre-wrap'}}>{agent.prompt}</pre>
      </div>
    </div>
  );
}

function AgentCard({ agent }) {
  const [showModal, setShowModal] = React.useState(false);
  const a = AGENTS.find(x => x.k === agent.k);
  return (
    <>
      <div className="agent-card" onClick={() => setShowModal(true)}>
        <div className="top">
          <span className={"glyph" + (agent.k === 'cto' ? ' cto' : '')}>{a.glyph}</span>
          <div>
            <h3>{a.name}{agent.k === 'cto' && <span style={{fontSize:11, color:'var(--accent)', marginLeft:8, fontWeight:500, fontFamily:'var(--font-mono)'}}>leader</span>}</h3>
            <div className="role">{agent.role}</div>
          </div>
          <span className="model">{a.model}</span>
        </div>
        <p className="desc">{agent.desc}</p>
        <div className="tools">
          {agent.tools.map((t, i) => <Tag key={i}>{t}</Tag>)}
        </div>
        <div className="stats">
          <div className="stat"><div className="n">{agent.runs}</div><div className="l">runs</div></div>
          <div className="stat"><div className="n">{agent.dur}</div><div className="l">avg task</div></div>
          <div className="stat"><div className="n">{agent.rate}</div><div className="l">success</div></div>
        </div>
      </div>
      {showModal && <AgentModal agent={agent} onClose={() => setShowModal(false)}/>}
    </>
  );
}

function AgentsPage({ onNav }) {
  return (
    <AppShell
      active="agents" onNav={onNav}
      title="Agents"
      sub="6 agents · 1 leader + 5 specialists · click any card to view system prompt"
      actions={<>
        <Btn>{Ico.search}</Btn>
        <Btn>Compare prompts</Btn>
        <Btn kind="primary">{Ico.plus} New specialist</Btn>
      </>}
    >
      <div className="main-body">
        <div className="agents-grid">
          {AGENT_DATA.map(a => <AgentCard key={a.k} agent={a}/>)}
        </div>

        {/* Topology */}
        <div className="card">
          <div className="card-hdr">
            <span className="card-hdr-title">Topology</span>
            <span className="card-hdr-sub">how dispatch flows from CTO down</span>
          </div>
          <div className="card-body" style={{padding:'28px 18px'}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:24, alignItems:'center', maxWidth:760, margin:'0 auto'}}>
              <div style={{gridColumn:'1 / -1', display:'flex', justifyContent:'center'}}>
                <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:'var(--accent-soft)', border:'1px solid var(--accent)', borderRadius:8}}>
                  <span style={{fontFamily:'var(--font-mono)', fontSize:18, color:'var(--accent)'}}>Ω</span>
                  <div>
                    <div style={{fontSize:13, fontWeight:600}}>CTO</div>
                    <div style={{fontSize:11, color:'var(--fg-muted)', fontFamily:'var(--font-mono)'}}>orchestrator · opus</div>
                  </div>
                </div>
              </div>
              <div style={{gridColumn:'1 / -1', display:'grid', gridTemplateColumns:'repeat(5, 1fr)', height:36}}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{borderLeft: i===2 ? '1px solid var(--border-strong)' : '1px solid var(--border)', height:'100%', justifySelf:'center', width:1}}/>
                ))}
              </div>
              {['arc','dev','qa','dvo','sec'].map(k => {
                const a = AGENTS.find(x => x.k === k);
                return (
                  <div key={k} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'10px 8px', background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:7, textAlign:'center'}}>
                    <span style={{fontFamily:'var(--font-mono)', fontSize:14, color:'var(--fg)'}}>{a.glyph}</span>
                    <div style={{fontSize:12, fontWeight:500}}>{a.name}</div>
                    <div style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--fg-faint)'}}>{a.model}</div>
                  </div>
                );
              })}
            </div>
            <p style={{margin:'18px auto 0', maxWidth:560, textAlign:'center', color:'var(--fg-muted)', fontSize:12, lineHeight:1.55}}>
              The CTO is the only agent humans address. Sub-agents return structured results to the CTO; they never speak to the user directly. Parallel dispatch is the default; sequential is opt-in.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

window.AgentsPage = AgentsPage;
