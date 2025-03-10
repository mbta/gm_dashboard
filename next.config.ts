import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  basePath: '/gm_dashboard',
  assetPrefix: '/gm_dashboard/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
