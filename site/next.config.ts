import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingIncludes: {
    "/api/runs": ["./data/runs/**/*"],
    "/api/runs/[id]": ["./data/runs/**/*"],
  },
};

export default nextConfig;
