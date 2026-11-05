import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/providers";
import { isNativeBuild } from "@/lib/platform/build";
import { STATIC_ROUTE_SCRIPT } from "@/lib/platform/static-route-script";

// Barlow isn't a variable font on Google Fonts, so each weight is listed.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Semi_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gym Ledger — Science-based Training",
  description: "Track workouts, build strength, achieve your goals.",
  applicationName: "Gym Ledger",
  appleWebApp: {
    capable: true,
    title: "Gym Ledger",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} dark h-full antialiased`}
    >
      {isNativeBuild && (
        <head>
          {/* Must run before Next loads; see static-route-script.ts. */}
          <script dangerouslySetInnerHTML={{ __html: STATIC_ROUTE_SCRIPT }} />
        </head>
      )}
      <body className="min-h-full bg-background text-foreground">
        <div className="relative mx-auto max-w-md min-h-screen bg-background">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
