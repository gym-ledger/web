// In-app URLs for the screens that show one record.
//
// The web build serves them as dynamic routes (/exercises/<id>). The native
// build is a static export, which can only contain pages known at build time,
// so it routes the same screens through fixed pages that read the id from the
// query string (/exercises/detail?id=<id>). Always build these links through
// here, never by hand, or a native user lands on a page that doesn't exist.
//
// The query-string pages exist in the web build too, so these URLs also work
// in a browser; the web just keeps its existing, nicer URLs.

import { isNativeBuild } from "@/lib/platform/build";

function withQuery(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

export function exerciseDetailHref(exerciseId: string): string {
  return isNativeBuild
    ? withQuery("/exercises/detail", { id: exerciseId })
    : `/exercises/${encodeURIComponent(exerciseId)}`;
}

export function workoutSessionHref(sessionId: string, options: { completed?: boolean } = {}): string {
  const completed = options.completed ? "1" : undefined;
  return isNativeBuild
    ? withQuery("/workout/history/session", { id: sessionId, completed })
    : withQuery(`/workout/history/${encodeURIComponent(sessionId)}`, { completed });
}

export function planVersionHref(versionId: string, options: { edit?: boolean } = {}): string {
  const edit = options.edit ? "1" : undefined;
  return isNativeBuild
    ? withQuery("/workout/plans/version", { id: versionId, edit })
    : withQuery(`/workout/plans/${encodeURIComponent(versionId)}`, { edit });
}
