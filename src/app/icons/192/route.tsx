import { ImageResponse } from "next/og";

// No per-request variation — cache this at build time instead of
// re-rendering the icon on every fetch.
export const dynamic = "force-static";

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
          fontSize: 116,
          fontWeight: 900,
          fontFamily: "sans-serif",
        }}
      >
        A
      </div>
    ),
    { width: 192, height: 192 },
  );
}
