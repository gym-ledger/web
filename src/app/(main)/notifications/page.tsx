"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { notifications as initialNotifications } from "@/lib/data/progress";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(initialNotifications);

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/home">
            <button className="flex size-9 items-center justify-center rounded-xl bg-card ring-1 ring-foreground/10 hover:bg-secondary transition-colors">
              <ArrowLeft className="size-4 text-foreground" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Check className="size-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="flex flex-col px-4 py-4 gap-2">
        {notifs.map((notif, i) => (
          <motion.button
            key={notif.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => markRead(notif.id)}
            className={cn(
              "flex items-start gap-3 rounded-2xl p-4 text-left ring-1 transition-all w-full",
              notif.read
                ? "bg-card ring-foreground/8 opacity-70"
                : "bg-card ring-foreground/12"
            )}
          >
            {/* Unread indicator */}
            <div className="relative shrink-0 mt-0.5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-xl">
                {notif.emoji}
              </div>
              {!notif.read && (
                <div className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm leading-snug",
                  notif.read ? "font-medium text-muted-foreground" : "font-semibold text-foreground"
                )}
              >
                {notif.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {notif.body}
              </p>
              <p className="mt-1.5 text-[10px] text-muted-foreground/60">{notif.timestamp}</p>
            </div>
          </motion.button>
        ))}

        {notifs.every((n) => n.read) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 py-12 text-center"
          >
            <span className="text-4xl">✅</span>
            <p className="text-sm font-medium text-foreground">All caught up</p>
            <p className="text-xs text-muted-foreground">No unread notifications</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
