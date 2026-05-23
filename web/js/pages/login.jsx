// LoginPage — OIDC authorization-code flow entry point.
// Collects only an email address as login_hint; no passwords ever touch this page.

(function () {

  // Maps IdP error codes to user-facing strings.
  // Raw error_description from the IdP is intentionally never shown to the user.
  const ERROR_MAP = {
    access_denied:           "Incorrect credentials.",
    account_locked:          "Your account has been locked. Contact IT support.",
    temporarily_unavailable: "Authentication is temporarily unavailable.",
    server_error:            "An unexpected error occurred.",
  };

  // Returns the message for a given IdP error code, or a generic fallback.
  // The fallback ensures unknown codes also never leak raw IDP strings.
  function mapError(code) {
    return ERROR_MAP[code] || ERROR_MAP["server_error"];
  }

  // Reads a single query-string parameter from the current URL without
  // using any library — keeps this file self-contained.
  function qp(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // Generates a cryptographically random state token (128 bits of entropy).
  // Used for CSRF protection: stored in sessionStorage before redirect,
  // validated on the callback leg (handled by app.jsx auth guard / server).
  function generateState() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
  }

  function LoginPage() {
    const [email, setEmail] = React.useState("");
    const [busy,  setBusy]  = React.useState(false);

    // On mount: if we're returning from the IdP callback (?error=…), surface
    // the mapped message.  We intentionally read only `error`, never
    // `error_description`, to avoid rendering untrusted IdP content.
    const callbackError = React.useMemo(() => {
      const code = qp("error");
      return code ? mapError(code) : null;
    }, []);

    function handleSubmit(e) {
      e.preventDefault();
      if (!email.trim() || busy) return;
      setBusy(true);

      // Generate a new random state token and persist it so the callback leg
      // (handled in app.jsx) can verify it against the ?state= query param.
      // sessionStorage is scoped to the tab and is cleared on tab close.
      const state = generateState();
      sessionStorage.setItem("oidc_state", state);

      // Build the authorize URL.  login_hint pre-fills the IdP email field
      // but does not transmit a password — the IdP owns the credential check.
      // We never log the email value here (no console.log / analytics call).
      const params = new URLSearchParams({
        login_hint:   email.trim(),
        state,
        redirect_uri: window.location.origin + "/auth/callback",
      });

      // Hard-navigate to the backend authorize endpoint; the backend will
      // redirect onward to the IdP with the full OIDC request.
      window.location.assign("/api/auth/authorize?" + params.toString());
      // Note: we intentionally do NOT reset busy here — the page is leaving.
    }

    return (
      <div className="login-root">
        <div className="login-card">
          {/* Brand mark */}
          <div className="login-brand">
            <div className="login-logo">AI</div>
            <span className="login-brand-name">Agent IT Team</span>
          </div>

          <h1 className="login-heading">Sign in</h1>
          <p className="login-sub">Enter your work email to continue via SSO.</p>

          {/* Error banner — only shown on callback with ?error= present.
              Text comes exclusively from ERROR_MAP, never from the IdP
              response directly, and is rendered as text content (no HTML). */}
          {callbackError && (
            <div className="login-error" role="alert" aria-live="assertive">
              <span className="login-error-ico">{Ico.warn}</span>
              <span>{callbackError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <label className="login-label" htmlFor="login-email">
              Work email
            </label>
            <input
              id="login-email"
              className="login-input"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={busy}
              required
              aria-required="true"
            />

            <button
              type="submit"
              className={"btn primary login-submit" + (busy ? " busy" : "")}
              disabled={busy || !email.trim()}
            >
              {busy
                ? <><span className="login-spinner">{Ico.spin}</span> Redirecting…</>
                : "Continue with SSO"
              }
            </button>
          </form>

          <p className="login-footer">
            You will be redirected to your organization's identity provider.
          </p>
        </div>
      </div>
    );
  }

  // Expose on window so app.jsx can reference it without a module bundler.
  window.LoginPage = LoginPage;

})();
