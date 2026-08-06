import type { MetadataRoute } from "next";

// Colors match the app's dark theme (see src/app/globals.css --primary /
// --background under the .dark selector — the app always renders dark,
// see the `dark` class hardcoded onto <html> in layout.tsx). oklch()
// converted to hex since not every manifest consumer resolves oklch().
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "APEX — Science-based Training",
    short_name: "APEX",
    description: "Track workouts, build strength, achieve your goals.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020202",
    theme_color: "#147fff",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
