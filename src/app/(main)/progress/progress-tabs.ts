const VALID_TABS = ["overview", "strength", "volume", "body"];

/** The tab to open for a `?tab=` value; anything unknown falls back to overview. */
export function resolveProgressTab(tab: string | null | undefined): string {
  return tab && VALID_TABS.includes(tab) ? tab : "overview";
}
