"use client";

// /workout/history/session?id=<sessionId>[&completed=1]: the finished-workout
// screen under a fixed URL, for the native build's static export (see
// src/lib/routes.ts). The web build serves it too, but links there to
// /workout/history/<id>.
import { Suspense } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { SessionDetailScreen } from "@/components/workout/session-detail-screen";

function SessionFromQuery() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  if (!id) notFound();
  // The key remounts the screen when only the id changes, as a dynamic route would.
  return <SessionDetailScreen key={id} sessionId={id} justCompleted={searchParams.get("completed") === "1"} />;
}

export default function WorkoutSessionByQueryPage() {
  return (
    <Suspense>
      <SessionFromQuery />
    </Suspense>
  );
}
