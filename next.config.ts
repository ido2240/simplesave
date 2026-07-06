import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Document uploads go through server actions; the default 1MB cap would
    // reject real scans/photos. Match the documents page's 10MB promise
    // (+ headroom for multipart encoding). Per-file size is still enforced
    // server-side in app/documents/actions.ts (MAX_BYTES = 10MB).
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
