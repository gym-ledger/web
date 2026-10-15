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
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="label-caps flex items-center gap-1.5 text-warning">
          <AlertTriangle className="size-3.5" />
          Homework
        </h2>
        <span className="text-xs text-muted-foreground">
          {alarms.length} flag{alarms.length !== 1 ? "s" : ""} from your sets
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
              className="flex items-start gap-3 rounded-2xl border border-warning-line bg-warning-surface p-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-warning">{alarm.exercise_name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(alarm.created_at)}</span>
                </p>
                <p className="mt-0.5 text-[15px] text-foreground">{alarm.message}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDismiss(alarm.id)}
                disabled={dismissingId === alarm.id}
                aria-label={`Mark "${alarm.message}" as done`}
                className="-m-1 flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-warning/15 hover:text-foreground disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
