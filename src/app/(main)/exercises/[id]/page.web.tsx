"use client";

// Web-only route (`.web.tsx`, see next.config.ts): a static export can't hold
// dynamic routes, so the native build reaches this screen through
// /exercises/detail?id= instead.
import { use } from "react";
import { ExerciseDetailScreen } from "@/components/exercises/exercise-detail-screen";

export default function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ExerciseDetailScreen id={id} />;
}
