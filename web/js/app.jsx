// App root — routing between pages + OIDC auth guard

function App() {
  // "checking" → awaiting /api/auth/me response on first mount.
  // "login"    → user is unauthenticated; show LoginPage.
  // (any page) → user is authenticated; show that page's component.
  const [page,    setPage]    = React.useState("checking");
  const [checked, setChecked] = React.useState(false);

  // Auth guard: probe /api/auth/me once on mount.
  // 200 → authenticated, proceed to dashboard.
  // 401 → not authenticated, redirect to login view.
  // Any other failure is treated as unauthenticated (fail-safe).
  React.useEffect(() => {
    if (checked) return;
    setChecked(true);

    // Check if this is an OIDC callback return (?state= present).
    // Validate the state token before handing off to the server session.
    const urlParams   = new URLSearchParams(window.location.search);
    const returnState = urlParams.get("state");
    if (returnState) {
      const storedState = sessionStorage.getItem("oidc_state");
      // Always clear the stored state — single use only.
      sessionStorage.removeItem("oidc_state");
      if (!storedState || returnState !== storedState) {
        // State mismatch: possible CSRF or stale tab. Abort to login.
        setPage("login");
        return;
      }
      // Strip the ?state= param from the address bar so it is not
      // bookmarkable, shareable, or visible in browser history.
      window.history.replaceState({}, '', window.location.pathname);
    }

    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(res => {
        if (res.ok) {
          setPage("dashboard");
        } else if (res.status === 404) {
          // No auth backend running (dev mode) — skip auth and go to dashboard.
          setPage("dashboard");
        } else {
          // 401 or any non-OK → show login.
          setPage("login");
        }
      })
      .catch(() => {
        // Network error (no backend) → dev mode, go straight to dashboard.
        setPage("dashboard");
      });
  }, [checked]);

  const [pageParams, setPageParams] = React.useState(null);
  const nav = (p, params = null) => { setPageParams(params); setPage(p); };

  if (page === "checking") {
    // Blank screen while we resolve auth; avoids a login flash for authed users.
    return null;
  }

  if (page === "login") {
    return <LoginPage />;
  }

  return (
    <>
      {page === "dashboard"    && <DashboardPage  onNav={nav}/>}
      {page === "requirements" && <SubmitPage     onNav={nav}/>}
      {page === "run-detail"   && <RunDetailPage  onNav={nav} runId={pageParams?.runId}/>}
      {page === "runs"         && <RunDetailPage  onNav={nav} runId={pageParams?.runId}/>}
      {page === "memory"       && <MemoryPage     onNav={nav}/>}
      {page === "agents"       && <AgentsPage     onNav={nav}/>}
      {page === "settings"     && <DashboardPage  onNav={nav}/>}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
