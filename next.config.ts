import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow production builds to complete even if type errors exist
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to complete even if ESLint warnings/errors exist
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
