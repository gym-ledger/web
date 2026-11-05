"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Native build only. The web's server-side redirect("/home") exports as a bare
// redirect document without the root layout's <head>, so it would lose the
// static-route script (see lib/platform/static-route-script.ts). That matters
// here, because Capacitor serves this file for every path it doesn't know.
// So render through the layout and redirect on the client instead.
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/home/");
  }, [router]);
  return null;
}
