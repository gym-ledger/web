"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteAccountDrawer } from "@/components/profile/delete-account-drawer";
import { ApiError } from "@/lib/api-client";
import { downloadDataExport, fetchAccountData, requestDataExport, type AccountData } from "@/lib/api/account";
import { formatLongDate } from "@/lib/format-date";

/** Id of this section; the "your data is ready" notification links to it. */
export const YOUR_DATA_SECTION_ID = "your-data";

/** How often a waiting export is checked on while this screen is open. */
const POLL_MS = 10_000;

const chip = "h-9 rounded-full border border-input bg-card px-3 text-[13px] font-semibold disabled:opacity-50";

function formatSize(bytes: number | null) {
  if (bytes == null) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Settings > Your data: request a copy of everything stored about you (built
 * in the background; a notification says when it's ready), download the
 * latest one, and delete the account.
 */
export function YourDataSection() {
  const [data, setData] = useState<AccountData | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const scrolled = useRef(false);

  const load = useCallback(() => fetchAccountData().then(setData).catch(() => {}), []);

  useEffect(() => {
    void load();
  }, [load]);

  const latest = data?.export.latest ?? null;
  const preparing = latest?.status === "pending" || latest?.status === "processing";

  useEffect(() => {
    if (!preparing) return;
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [preparing, load]);

  // Opened from the notification (…/settings#your-data): bring the section into view once it's there.
  useEffect(() => {
    if (!data || scrolled.current || window.location.hash !== `#${YOUR_DATA_SECTION_ID}`) return;
    scrolled.current = true;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data]);

  async function handleRequest() {
    setRequesting(true);
    try {
      const created = await requestDataExport();
      setData((d) => (d ? { ...d, export: { ...d.export, latest: created } } : d));
      toast.success("We're preparing your data. You'll get a notification when it's ready.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't request your data");
    } finally {
      setRequesting(false);
    }
  }

  async function handleDownload() {
    if (!latest) return;
    setDownloading(true);
    try {
      await downloadDataExport(latest.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't download your data");
      void load();
    } finally {
      setDownloading(false);
    }
  }

  if (!data) return null;

  let exportSub: string;
  if (!latest) exportSub = "A copy of everything stored about you, as a JSON file";
  else if (preparing) exportSub = "Preparing… we'll notify you when it's ready";
  else if (latest.status === "ready")
    exportSub = `Ready${latest.size_bytes ? ` · ${formatSize(latest.size_bytes)}` : ""} · until ${formatLongDate(latest.expires_at!)}`;
  else if (latest.status === "failed") exportSub = "The last one didn't work. Request it again";
  else exportSub = "The last copy has expired";

  const scheduledFor = data.deletion.scheduled_for;

  return (
    <section id={YOUR_DATA_SECTION_ID} ref={sectionRef} className="flex scroll-mt-6 flex-col">
      <h2 className="label-caps border-b border-input pb-2">Your data</h2>

      <div className="flex items-center justify-between gap-3 border-b border-line py-3.5">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">Download your data</p>
          <p className="text-[13px] text-muted-foreground">{exportSub}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {latest?.status === "ready" && (
            <button type="button" onClick={handleDownload} disabled={downloading} className={`${chip} border-primary text-primary`}>
              {downloading ? <Loader2 className="size-4 animate-spin" /> : "Download"}
            </button>
          )}
          {preparing ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Preparing" />
          ) : (
            <button type="button" onClick={handleRequest} disabled={requesting} className={chip}>
              {requesting ? <Loader2 className="size-4 animate-spin" /> : latest ? "Request new" : "Request"}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-line py-3.5">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-destructive">Delete account</p>
          <p className="text-[13px] text-muted-foreground">
            {scheduledFor
              ? `Scheduled for ${formatLongDate(scheduledFor)}`
              : `Signs you out everywhere; deleted for good after ${data.deletion.grace_days} days`}
          </p>
        </div>
        {!scheduledFor && (
          <button
            type="button"
            // Refetched first: a password set a moment ago changes how deletion is confirmed.
            onClick={() => void load().finally(() => setDeleteOpen(true))}
            className={`${chip} border-destructive text-destructive`}
          >
            Delete
          </button>
        )}
      </div>

      <DeleteAccountDrawer
        open={deleteOpen}
        confirmWith={data.deletion.confirm_with}
        graceDays={data.deletion.grace_days}
        onClose={() => setDeleteOpen(false)}
      />
    </section>
  );
}
