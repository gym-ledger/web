"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { fetchActiveAlarms, discardAlarm, type ActiveAlarm } from "@/lib/api/workout";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function HomeworkWidget() {
  const [alarms, setAlarms] = useState<ActiveAlarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveAlarms()
      .then(setAlarms)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDismiss(id: string) {
    setDismissingId(id);
    try {
      await discardAlarm(id);
      setAlarms((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Failed to dismiss");
    } finally {
      setDismissingId(null);
    }
  }

  if (loading || alarms.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-base font-bold text-foreground">
          <AlertTriangle className="size-4 text-amber-500" />
          Homework
        </h2>
        <span className="text-xs text-muted-foreground">
          {alarms.length} item{alarms.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {alarms.map((alarm) => (
            <motion.div
              key={alarm.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="flex items-start gap-3 rounded-2xl bg-amber-500/10 p-3.5 ring-1 ring-amber-500/20"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                <AlertTriangle className="size-4 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">
                  {alarm.exercise_name}
                </p>
                <p className="mt-0.5 text-sm text-foreground/90">{alarm.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatDate(alarm.created_at)}
                </p>
              </div>
              <button
                onClick={() => handleDismiss(alarm.id)}
                disabled={dismissingId === alarm.id}
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-amber-500/15 disabled:opacity-50"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
