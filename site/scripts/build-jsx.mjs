// Pre-compile every .jsx in ../web/js into a .js sibling under
// public/dashboard/js. The dashboard SPA then loads plain .js,
// avoiding (a) Vercel's static-serving exclusion of .jsx, and
// (b) the runtime cost of @babel/standalone in the browser.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import babel from "@babel/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, "../../web/js");
const OUT_ROOT = path.resolve(__dirname, "../public/dashboard/js");

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile() && entry.name.endsWith(".jsx")) out.push(full);
  }
  return out;
}

const files = await walk(SRC_ROOT);
for (const file of files) {
  const rel = path.relative(SRC_ROOT, file);
  const outPath = path.join(OUT_ROOT, rel.replace(/\.jsx$/, ".js"));
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const src = await fs.readFile(file, "utf8");
  const result = await babel.transformAsync(src, {
    presets: [["@babel/preset-react", { runtime: "classic" }]],
    filename: file,
    babelrc: false,
    configFile: false,
  });
  await fs.writeFile(outPath, result.code, "utf8");
}
console.log(`build-jsx: compiled ${files.length} files → ${path.relative(process.cwd(), OUT_ROOT)}`);
