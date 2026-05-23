# Decisions

Append-only ADR log. CTO appends after each run. Never overwrite or delete entries.

---

## ADR-001 · run_a1b2c3d4 · 2026-05-23

**Requirement:** Add user login page (priority: low)
**Outcome:** Approved

**Decision: OIDC authorization-code flow — no password field on frontend**
The login page collects only email as `login_hint` and redirects to the IDP. No credentials are handled or stored by the frontend. All token exchange is done server-side by the existing `auth/` backend.

**Rejected alternatives:**
- ROPC grant (password in browser memory, deprecated in OAuth 2.0 Security BCP)
- BFF session cookie approach (requires `auth/` backend changes — frozen surface)

**Pre-production checklist (Security conditions):**
- [ ] Implement `Referrer-Policy: no-referrer` on login page response
- [ ] Switch CDN scripts from `react.development.js` to `react.production.min.js`
- [ ] Define Content-Security-Policy header for auth pages
- [ ] Confirm IDP enforces strict `redirect_uri` allowlist matching
- [ ] Confirm `/api/auth/me` returns minimal claims only
