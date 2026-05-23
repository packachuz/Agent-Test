# Lessons

Failure patterns the agents have learned. CTO and Security append; all agents read.

---

## Login Page / OIDC Authorization-Code Flow (security review 2026-05-23)

**Pattern: login_hint handling must not leak into logs or analytics.**
The user-supplied email is PII. It flows as a URL query parameter (`login_hint`) in the redirect to the IDP. Ensure no server-side request logging, client-side analytics, or error-reporting SDKs (Sentry, Datadog RUM, etc.) capture the full redirect URL before the IDP strips the hint.

**Pattern: OIDC `state` parameter is mandatory for CSRF protection.**
A cryptographically random `state` value must be generated per authorization request, stored in session storage (NOT localStorage), compared on redirect return, and discarded immediately. Omitting or reusing `state` opens the flow to CSRF / login-CSRF.

**Pattern: Content-Security-Policy must be set before any auth page ships.**
The current frontend serves inline Babel transpilation and React from unpkg CDN. Auth pages carry higher risk; a CSP with `script-src` restricted to known hashes/nonces is required before the login page goes to production.

**Pattern: React development builds must not reach production.**
`index.html` currently loads `react.development.js` and `react-dom.development.js` from unpkg. Development builds include verbose warnings and debugging hooks that increase attack surface. Production builds (`react.production.min.js`) must be used for any deployed environment.

**Pattern: `login_hint` is advisory — IDP must not blindly trust it for account selection.**
The frontend passes email as a hint; the IDP must still require full authentication. Document that the IDP configuration enforces this to prevent account enumeration shortcuts.

**Pattern: `GET /api/auth/me` response must not include fields beyond what the UI needs.**
The auth-state endpoint should return minimal claims (e.g., display name, role). Full profile PII should not be returned in a polling endpoint that may be captured by browser devtools/network logs.
