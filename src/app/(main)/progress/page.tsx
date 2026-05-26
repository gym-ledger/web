import { ProgressPageClient } from "./progress-client";

const VALID_TABS = ["overview", "strength", "volume", "body"];

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const defaultTab = VALID_TABS.includes(tab ?? "") ? (tab as string) : "overview";
  return <ProgressPageClient defaultTab={defaultTab} />;
}
