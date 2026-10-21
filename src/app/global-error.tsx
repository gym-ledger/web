"use client";

import "./globals.css";
import { AppErrorScreen } from "@/components/shared/app-error-screen";

/**
 * Replaces the root layout when it (or anything not caught lower down)
 * throws. Next's built-in version only re-submits the page, which can be
 * answered with the same stale cached page after a deploy.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <div className="relative mx-auto max-w-md min-h-screen bg-background">
          <AppErrorScreen error={error} />
        </div>
      </body>
    </html>
  );
}
