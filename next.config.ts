import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Uploaded photos are served from R2 via our own route, not Next's
    // built-in optimizer (which needs a Node server we don't have on Workers).
    unoptimized: true,
  },
};

export default nextConfig;

// Enables `env.DB` / `env.UPLOADS` bindings during `next dev`, not just
// under `wrangler dev`, by emulating them via a local Miniflare instance.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
