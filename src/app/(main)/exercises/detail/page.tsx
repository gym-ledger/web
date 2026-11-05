"use client";

// /exercises/detail?id=<exerciseId>: the exercise screen under a fixed URL, for
// the native build's static export (see src/lib/routes.ts). The web build
// serves it too, but links there to /exercises/<id>.
import { Suspense } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { ExerciseDetailScreen } from "@/components/exercises/exercise-detail-screen";

function ExerciseFromQuery() {
  const id = useSearchParams().get("id");
  if (!id) notFound();
  // The key remounts the screen when only the id changes, as a dynamic route would.
  return <ExerciseDetailScreen key={id} id={id} />;
}

export default function ExerciseDetailByQueryPage() {
  return (
    <Suspense>
      <ExerciseFromQuery />
    </Suspense>
  );
}
