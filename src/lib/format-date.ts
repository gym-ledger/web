/** "20 November 2026" in the user's locale. */
export const formatLongDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
