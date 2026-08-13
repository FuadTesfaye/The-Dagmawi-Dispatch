import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Security mitigations: restrict image optimizer remote patterns and
  // disable experimental Server Actions to reduce exposure to known Next.js
  // DoS/SSRF issues until a safe upgrade path is planned.
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverActions: false,
  },
};

export default nextConfig;
