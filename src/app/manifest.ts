import type { MetadataRoute } from "next";

// Colors match the app's Performance Dark theme (src/app/globals.css) — the
// app always renders dark (see the `dark` class hardcoded onto <html> in layout.tsx).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "APEX — Science-based Training",
    short_name: "APEX",
    description: "Track workouts, build strength, achieve your goals.",
    // Stable identity for the installed app, independent of start_url.
    id: "/",
    // "/" only redirects to /home — launching there directly saves a round
    // trip and gives the service worker a plain (non-redirect) page to cache.
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
