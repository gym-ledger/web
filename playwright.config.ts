import { defineConfig, devices } from "@playwright/test";

// Run `node e2e/up.mjs` first (see e2e/README.md).
export default defineConfig({
  testDir: "./e2e",
  reporter: "line",
  // Specs share one local API and its per-IP rate limits, so run them one at a time.
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: process.env.E2E_WEB_URL ?? `http://localhost:${process.env.E2E_WEB_PORT ?? "3002"}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    ...devices["Pixel 7"],
  },
});
