"use client";

// Web-only route (`.web.tsx`, see next.config.ts): a static export can't hold
// dynamic routes, so the native build reaches this screen through
// /workout/history/session?id= instead.
import { use } from "react";
import { SessionDetailScreen } from "@/components/workout/session-detail-screen";

export default function WorkoutHistoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ completed?: string }>;
}) {
  const { sessionId } = use(params);
  const { completed } = use(searchParams);
  return <SessionDetailScreen sessionId={sessionId} justCompleted={completed === "1"} />;
}
