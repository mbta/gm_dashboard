import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  basePath: isProd ? "/gm_dashboard" : "",
  assetPrefix: isProd ? "/gm_dashboard/" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
