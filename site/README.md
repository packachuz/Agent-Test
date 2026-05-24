# site/ — Next.js front for Agent-Test

Minimal Next.js 15 (App Router, TS) app. Serves a landing page at `/` and
proxies the existing `web/` SPA at `/dashboard/` via a build-time copy
(`prebuild` script copies `../web` → `public/dashboard`).

## Run locally

```bash
cd site
npm install
npm run dev          # http://localhost:3000  (dashboard at /dashboard/)
```

## Deploy on Vercel

In **Vercel → New Project → Import** for this repo:

- **Application Preset:** Next.js (auto-detected)
- **Root Directory:** `site`  ← important, not `./`
- Everything else: defaults

After the first deploy, every push to the production branch redeploys
automatically. The landing page shows the live commit SHA so you can
confirm.
