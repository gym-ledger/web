"use client";

// Web-only route (`.web.tsx`, see next.config.ts): a static export can't hold
// dynamic routes, so the native build reaches this screen through
// /workout/plans/version?id= instead.
import { use } from "react";
import { PlanDetailScreen } from "@/components/workout/plan-detail-screen";

export default function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ versionId: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { versionId } = use(params);
  const startInEditMode = use(searchParams).edit === "1";
  return <PlanDetailScreen versionId={versionId} startInEditMode={startInEditMode} />;
}
