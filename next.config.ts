import type { NextConfig } from "next";

// `BUILD_TARGET=native` (npm run build:native) builds the static bundle that
// ships inside the Capacitor app: plain files in out/, no Node server. Any
// other value builds the web app exactly as before.
const isNativeBuild = process.env.BUILD_TARGET === "native";

// One id per build. On the web Next uses it for version-skew protection: a
// client still running the previous deploy's JS gets a full reload on its next
// navigation instead of a client-side one that loads chunks which no longer
// exist. The service worker is registered with it too, so every deploy
// installs a fresh worker with its own pages cache (see public/sw.js). In the
// native build it is only NEXT_PUBLIC_DEPLOYMENT_ID (the bundle's version).
const deploymentId = process.env.NEXT_DEPLOYMENT_ID || `build-${Date.now().toString(36)}`;

// Route files can be limited to one build: `page.web.tsx` is a route only in
// the web build, `page.native.tsx` only in the native one. In the other build
// the file is just an ordinary module that nothing routes to. Plain `.tsx`
// files are routes in both.
const PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];

const sharedConfig: NextConfig = {
  pageExtensions: [isNativeBuild ? "native.tsx" : "web.tsx", ...PAGE_EXTENSIONS],
  env: {
    NEXT_PUBLIC_DEPLOYMENT_ID: deploymentId,
    NEXT_PUBLIC_BUILD_TARGET: isNativeBuild ? "native" : "web",
  },
  transpilePackages: ["geist"],
  reactCompiler: true,
};

const webConfig: NextConfig = {
  ...sharedConfig,
  deploymentId,
  output: "standalone",
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

// Static export can't run redirects() or headers(), and has no image server.
// Every route is written out as <route>/index.html so the webview's file
// server finds it for a full page load as well as a client navigation.
//
// No `deploymentId` here: with it, Next leaves the build id out of each page's
// RSC data and expects it in an x-nextjs-deployment-id response header, which
// a static file server never sends. Every in-app navigation then fails the
// skew check and becomes a full page reload. The bundle is all one build
// anyway (live updates swap it whole), so there's no skew to protect against.
const nativeConfig: NextConfig = {
  ...sharedConfig,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default isNativeBuild ? nativeConfig : webConfig;
