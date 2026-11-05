"use client";

// /workout/plans/version?id=<versionId>[&edit=1]: the plan screen under a fixed
// URL, for the native build's static export (see src/lib/routes.ts). The web
// build serves it too, but links there to /workout/plans/<id>.
import { Suspense } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { PlanDetailScreen } from "@/components/workout/plan-detail-screen";

function PlanFromQuery() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  if (!id) notFound();
  // The key remounts the screen when only the id changes (e.g. "Update
  // available" opens the newer version), as a dynamic route would.
  return <PlanDetailScreen key={id} versionId={id} startInEditMode={searchParams.get("edit") === "1"} />;
}

export default function PlanVersionByQueryPage() {
  return (
    <Suspense>
      <PlanFromQuery />
    </Suspense>
  );
}
