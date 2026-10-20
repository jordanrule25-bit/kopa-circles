import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@kopa/core", "@kopa/db"],
  // Lint runs separately in CI (pnpm lint) with the shared root config.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
