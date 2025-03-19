import type { NextConfig } from "next";

const isActions = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
