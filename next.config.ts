import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" output is for self-hosting only and breaks Vercel deploys.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Keep Prisma (native engine binaries) and the z-ai SDK out of the bundler.
  serverExternalPackages: ["@prisma/client", "prisma", "z-ai-web-dev-sdk"],
  // Ship the SQLite schema file (created by `prisma db push` during build)
  // and the generated Prisma client/engine inside the serverless bundle.
  outputFileTracingIncludes: {
    "/api/**": ["./prisma/dev.db", "./node_modules/.prisma/client/**"],
  },
};

export default nextConfig;
