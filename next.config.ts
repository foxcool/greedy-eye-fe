import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker production builds (standalone output)
  output: "standalone",
  // All routes served under /app prefix (shared domain with backend and auth via Traefik)
  basePath: "/app",
};

export default nextConfig;
