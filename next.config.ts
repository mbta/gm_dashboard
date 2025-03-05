import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  basePath: 'gm-dashboard',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
