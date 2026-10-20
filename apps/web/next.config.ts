import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run next to the dev server without sharing .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@kopa/core", "@kopa/db"],
  // Lint runs separately in CI (pnpm lint) with the shared root config.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      // The service worker must always be fresh so fixes reach phones.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
