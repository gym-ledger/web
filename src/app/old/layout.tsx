import { Geist, Geist_Mono } from "next/font/google";
import "./old-theme.css";
import { OldThemeScope } from "./old-theme-scope";

// Pre-redesign UI, kept reachable under /old/* for comparison. Pages and
// components here are frozen copies (src/old-ui/components) — don't build on them.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function OldLayout({ children }: { children: React.ReactNode }) {
  const fontClassName = `${geistSans.variable} ${geistMono.variable}`;
  return (
    <div className={`old-theme ${fontClassName} min-h-screen bg-background text-foreground`}>
      <OldThemeScope fontClassName={fontClassName} />
      {children}
    </div>
  );
}
