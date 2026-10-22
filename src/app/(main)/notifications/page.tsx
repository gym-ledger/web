"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/api/notifications";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";
import { useNotificationsChanged } from "@/lib/realtime/notificationStream";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

type NotificationsData = { unread: number; notifications: AppNotification[] };

export default function NotificationsPage() {
  const router = useRouter();
  const { data, loading, mutate, refresh } = useCachedQuery<NotificationsData>("notifications", fetchNotifications);
  useNotificationsChanged(() => void refresh());
  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  function markLocallyRead(id: string | null) {
    mutate((prev) => {
      const list = (prev?.notifications ?? []).map((n) => (id === null || n.id === id ? { ...n, read: true } : n));
      return { notifications: list, unread: list.filter((n) => !n.read).length };
    });
  }

  async function handleOpen(n: AppNotification) {
    if (!n.read) {
      markLocallyRead(n.id);
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.link) router.push(n.link);
  }

  async function handleMarkAll() {
    markLocallyRead(null);
    try {
      await markAllNotificationsRead();
    } catch {
      toast.error("Failed to mark notifications read");
    }
  }

  return (
    <div className="flex flex-col px-4 pb-6">
      <Link
        href="/home"
        aria-label="Back to home"
        className="mt-4 flex size-11 items-center justify-center rounded-full border border-input bg-card text-foreground transition-colors hover:bg-secondary"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : undefined}
        className="pt-4"
        action={
          unread > 0 ? (
            <button
              type="button"
              onClick={handleMarkAll}
              className="h-9 rounded-full border border-input bg-card px-3 text-[13px] font-semibold"
            >
              Mark all read
            </button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-dashed border-input py-10 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </p>
      ) : (
        <ul className="flex flex-col">
          {notifications.map((n, i) => (
            <li key={n.id} className={cn(i < notifications.length - 1 && "border-b border-line")}>
              <button
                type="button"
                onClick={() => handleOpen(n)}
                className="flex w-full items-start gap-3 py-3.5 text-left"
              >
                <span
                  className={cn("mt-2 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")}
                  aria-label={n.read ? undefined : "Unread"}
                  role={n.read ? undefined : "img"}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("text-[15px]", n.read ? "font-medium text-muted-foreground" : "font-semibold")}>
                      {n.title}
                    </span>
                    <span className="shrink-0 text-[11px] text-subtle">{timeAgo(n.created_at)}</span>
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{n.body}</span>
                </span>
                {n.link && <ChevronRight className="mt-1 size-4 shrink-0 text-subtle" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
