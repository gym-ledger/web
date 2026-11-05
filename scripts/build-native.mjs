// npm run build:native [-- --api=<url>] — builds the static bundle for the
// Capacitor app into out/ (BUILD_TARGET=native, see next.config.ts). A script
// instead of an inline env var so it runs the same in cmd, PowerShell and bash.
//
// The API URL is baked into the bundle. Without --api it comes from the env
// files like the web build (`.env` → production). For local testing:
//   npm run build:native -- --api=http://localhost:4000/api/v1   (browser on this PC)
//   npm run build:native -- --api=http://10.0.2.2:4000/api/v1    (Android emulator → this PC)
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const env = { ...process.env, BUILD_TARGET: "native" };
const nextArgs = [];
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--api=")) {
    const apiUrl = arg.slice("--api=".length).replace(/\/+$/, "");
    if (!/^https?:\/\/[^/]+/.test(apiUrl)) {
      console.error(`build:native: --api must be an http(s) URL, got "${apiUrl}"`);
      process.exit(1);
    }
    // A real environment variable wins over every .env file in Next.
    env.NEXT_PUBLIC_API_URL = apiUrl;
  } else {
    nextArgs.push(arg);
  }
}

console.log(
  `build:native: API = ${env.NEXT_PUBLIC_API_URL ?? "(from .env files)"}\n`,
);

const result = spawnSync(process.execPath, [nextBin, "build", ...nextArgs], { stdio: "inherit", env });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
