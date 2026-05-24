import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingIncludes: {
    "/api/runs": ["./data/runs/**/*"],
    "/api/runs/[id]": ["./data/runs/**/*"],
  },
  async rewrites() {
    return [
      // Map the dashboard URL to the (now fully self-contained) static HTML.
      // Public/ serves files at their exact paths but does not auto-index
      // nested directories — without this rewrite, /dashboard/ 404s on
      // `next dev` (Vercel happens to handle it, but explicit is safer).
      { source: "/dashboard", destination: "/dashboard/index.html" },
      { source: "/dashboard/", destination: "/dashboard/index.html" },
    ];
  },
};

export default nextConfig;
