// Web-only route (`.web.tsx`, see next.config.ts); the native build uses
// page.native.tsx, which reads ?tab= in the browser.
import { ProgressPageClient } from "./progress-client";
import { resolveProgressTab } from "./progress-tabs";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return <ProgressPageClient defaultTab={resolveProgressTab(tab)} />;
}
