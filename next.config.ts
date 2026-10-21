import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["geist"],
  reactCompiler: true,
  async redirects() {
    // The OTP login creates new accounts, so there is no separate sign-up.
    return [{ source: "/signup", destination: "/login", permanent: false }];
  },
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
