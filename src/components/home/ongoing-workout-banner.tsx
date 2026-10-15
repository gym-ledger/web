"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { fetchOngoingWorkoutSession, type OngoingWorkoutSession } from "@/lib/api/workout";

function formatElapsed(startedAtIso: string) {
  const totalMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAtIso).getTime()) / 60000),
  );
  if (totalMinutes < 1) return "Just started";
  if (totalMinutes < 60) return `${totalMinutes} min in`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}min in`;
}

export function OngoingWorkoutBanner() {
  const router = useRouter();
  const [session, setSession] = useState<OngoingWorkoutSession | null>(null);

  useEffect(() => {
    fetchOngoingWorkoutSession()
      .then(setSession)
      .catch(() => {});
  }, []);

  if (!session) return null;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => router.push("/workout/active")}
      className="flex w-full items-center gap-4 rounded-2xl border border-primary bg-card p-4 text-left transition-transform active:scale-[0.98]"
    >
      <span className="relative flex size-3 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex size-3 rounded-full bg-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="label-caps text-primary">Workout in progress</p>
        <h3 className="truncate font-display text-[22px] leading-tight font-bold">
          {session.day_name ?? session.program_name}
          {session.session_name ? ` · ${session.session_name}` : ""}
        </h3>
        <p className="text-[13px] text-muted-foreground">{formatElapsed(session.started_at)}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1 font-display text-base font-bold tracking-[0.08em] uppercase">
        Resume
        <ArrowRight className="size-4" />
      </span>
    </motion.button>
  );
}
