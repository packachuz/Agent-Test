// Build the dashboard SPA into a single self-contained index.html.
//
// Why: Next.js on Vercel refuses to serve files from public/dashboard/
// other than the auto-served index.html — every other path under
// /dashboard/ returns the Next.js 404 page, even for known-good
// extensions like .css and flat paths (verified by build_marker probe
// in ADR-013). Rather than fight the routing layer, we inline the
// styles + compiled JS into index.html so the dashboard is a single
// HTML response.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import babel from "@babel/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT  = path.resolve(__dirname, "../../web");
const SRC_ROOT  = path.join(WEB_ROOT, "js");
const OUT_HTML  = path.resolve(__dirname, "../public/dashboard/index.html");

// Load order matters: shared defines globals consumed by pages/app.
const ORDER = [
  "shared.jsx",
  "pages/dashboard.jsx",
  "pages/submit.jsx",
  "pages/run-detail.jsx",
  "pages/memory.jsx",
  "pages/agents.jsx",
  "pages/login.jsx",
  "app.jsx",
];

async function compile(rel) {
  const src = await fs.readFile(path.join(SRC_ROOT, rel), "utf8");
  const out = await babel.transformAsync(src, {
    presets: [["@babel/preset-react", { runtime: "classic" }]],
    filename: rel,
    babelrc: false,
    configFile: false,
  });
  return `/* ${rel} */\n${out.code}`;
}

const compiled = (await Promise.all(ORDER.map(compile))).join("\n;\n");
const styles   = await fs.readFile(path.join(WEB_ROOT, "styles.css"), "utf8");
const template = await fs.readFile(path.join(WEB_ROOT, "index.html"), "utf8");

const html = template
  .replace("/* @@INLINE_STYLES@@ */", styles)
  .replace("/* @@INLINE_SCRIPT@@ */", compiled);

await fs.mkdir(path.dirname(OUT_HTML), { recursive: true });
await fs.writeFile(OUT_HTML, html, "utf8");
console.log(
  `build-jsx: inlined ${ORDER.length} compiled files (${(compiled.length / 1024).toFixed(1)}KB JS, ` +
  `${(styles.length / 1024).toFixed(1)}KB CSS) → ${path.relative(process.cwd(), OUT_HTML)}`,
);
