import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["geist"],
  reactCompiler: true,
  async headers() {
    return [
      {
        // Browsers must always revalidate the worker itself, or a cached
        // copy keeps users on an old version of the app's offline logic.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
