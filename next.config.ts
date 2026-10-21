import type { NextConfig } from "next";

// One id per build. Next uses it for version-skew protection: a client still
// running the previous deploy's JS gets a full reload on its next navigation
// instead of a client-side one that loads chunks which no longer exist. The
// service worker is registered with it too, so every deploy installs a fresh
// worker with its own pages cache (see public/sw.js).
const deploymentId = process.env.NEXT_DEPLOYMENT_ID || `build-${Date.now().toString(36)}`;

const nextConfig: NextConfig = {
  output: "standalone",
  deploymentId,
  env: { NEXT_PUBLIC_DEPLOYMENT_ID: deploymentId },
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
