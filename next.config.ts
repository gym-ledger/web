import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["geist"],
  reactCompiler: true,
};

export default nextConfig;
