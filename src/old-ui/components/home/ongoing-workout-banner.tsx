"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
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
      onClick={() => router.push("/old/workout/active")}
      className="flex w-full items-center gap-3 rounded-2xl p-4 text-left shadow-lg ring-1 ring-white/10 transition-transform active:scale-[0.98]"
      style={{ backgroundColor: "oklch(0.28 0.10 258)" }}
    >
      <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <span className="absolute inline-flex size-3 animate-ping rounded-full bg-emerald-400 opacity-75" />
        <Play className="relative size-5 fill-white text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
          Workout in progress
        </p>
        <h3 className="truncate text-sm font-bold text-white">
          {session.day_name ?? session.program_name}
          {session.session_name ? ` · ${session.session_name}` : ""}
        </h3>
        <p className="mt-0.5 text-xs text-white/70">{formatElapsed(session.started_at)}</p>
      </div>
      <div className="flex items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold text-white">
        Resume
        <ArrowRight className="size-3.5" />
      </div>
    </motion.button>
  );
}
