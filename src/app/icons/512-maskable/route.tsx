import { ImageResponse } from "next/og";

// No per-request variation — cache this at build time instead of
// re-rendering the icon on every fetch.
export const dynamic = "force-static";

// "Maskable" icons get cropped to arbitrary shapes (circle, squircle, etc.)
// by Android — content must stay within the center ~80%-diameter safe zone,
// so this uses a noticeably smaller glyph than the non-maskable variants.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3b8cff",
          color: "#000000",
          fontSize: 200,
          fontWeight: 900,
          fontFamily: "sans-serif",
        }}
      >
        A
      </div>
    ),
    { width: 512, height: 512 },
  );
}
