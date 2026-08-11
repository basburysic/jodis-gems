import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // No image optimizer available on Workers (needs a Node server we don't
    // have there). Currently moot since there's no image upload feature, but
    // harmless to leave set for whenever photos come back.
    unoptimized: true,
  },
};

export default nextConfig;

// Enables `env.DB` bindings during `next dev`, not just under `wrangler dev`,
// by emulating them via a local Miniflare instance.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
