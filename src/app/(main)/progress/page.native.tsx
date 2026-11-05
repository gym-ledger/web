"use client";

// Native-only route (`.native.tsx`, see next.config.ts). The web's
// page.web.tsx reads ?tab= on the server; a static export has no server, so
// the native build reads it in the browser instead.
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProgressPageClient } from "./progress-client";
import { resolveProgressTab } from "./progress-tabs";

function ProgressFromQuery() {
  const tab = resolveProgressTab(useSearchParams().get("tab"));
  // The key re-applies the tab when only ?tab= changes (Tabs reads defaultValue once).
  return <ProgressPageClient key={tab} defaultTab={tab} />;
}

export default function ProgressPage() {
  return (
    <Suspense>
      <ProgressFromQuery />
    </Suspense>
  );
}
