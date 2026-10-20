import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run next to the dev server without sharing .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@kopa/core", "@kopa/db"],
  // Lint runs separately in CI (pnpm lint) with the shared root config.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
