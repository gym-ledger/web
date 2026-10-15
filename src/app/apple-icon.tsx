import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// No border-radius here — iOS applies its own rounded-square mask to
// apple-touch-icon, so a full-bleed square avoids a double-rounded look.
export default function AppleIcon() {
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
          fontSize: 108,
          fontWeight: 900,
          fontFamily: "sans-serif",
        }}
      >
        A
      </div>
    ),
    { ...size },
  );
}
