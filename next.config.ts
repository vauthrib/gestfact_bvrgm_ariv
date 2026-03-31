import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Disable static optimization for all pages
  experimental: {
    isrMemoryCacheSize: 0,
  },
};

export default nextConfig;
