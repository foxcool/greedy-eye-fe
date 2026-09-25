import type { NextConfig } from "next";

// All routes served under /app prefix (shared domain with backend and auth via Traefik)
const basePath = "/app";

const nextConfig: NextConfig = {
  // Required for Docker production builds (standalone output)
  output: "standalone",
  basePath,
  // Exposed for the few places that build a URL outside the router — opening a
  // heatmap tile in a new tab has no <a> to lean on.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
