import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["geist"],
  reactCompiler: true,
};

export default nextConfig;
