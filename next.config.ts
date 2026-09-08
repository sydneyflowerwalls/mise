import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // §3 of the integration brief: the Agent SDK extracts and spawns a bundled
  // Claude Code binary at runtime. Bundling the package breaks that resolution,
  // so it must stay external to the server build.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],

  typedRoutes: true,
};

export default nextConfig;
