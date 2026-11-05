import type { CapacitorConfig } from "@capacitor/cli";

// The native app ships the static export in out/ (`npm run build:native`).
//
// Release builds must never have server.url: the app would load its code from
// that server instead of the bundle. CAP_DEV_SERVER turns on live reload for
// development only, e.g.
//   CAP_DEV_SERVER=http://10.0.2.2:3000 npx cap run android
// and is read when `cap sync` / `cap run` copies this config into the native
// projects, so re-run `npx cap sync` without it before building a release.
const devServer = process.env.CAP_DEV_SERVER;

const config: CapacitorConfig = {
  appId: "com.mohitchahal.workout",
  appName: "Gym Ledger",
  webDir: "out",
  backgroundColor: "#000000",
  plugins: {
    // The app is dark-only: light status/navigation bar icons. The page keeps
    // viewport-fit=auto, so the WebView stays between the system bars and the
    // UI needs no safe-area padding (it looks exactly like the web app).
    SystemBars: {
      style: "DARK",
      insetsHandling: "native",
    },
    // iOS: shrink the whole WebView when the keyboard opens, as Android does,
    // so bottom sheets and inputs move above it instead of being covered.
    Keyboard: {
      resize: "native",
    },
  },
  ...(devServer ? { server: { url: devServer, cleartext: true } } : {}),
};

export default config;
