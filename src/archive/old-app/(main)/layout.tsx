"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNav } from "@/archive/old-ui/components/shared/bottom-nav";
import { useAuthStore } from "@/auth/authStore";

const FULLSCREEN_ROUTES = ["/old/workout/active"];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const status = useAuthStore((s) => s.status);

  const isFullscreen = FULLSCREEN_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (!_hasHydrated) return;
    if (status === "unauthenticated") {
      router.replace("/old/login");
    }
  }, [_hasHydrated, status, router]);

  if (!_hasHydrated || status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className={isFullscreen ? "flex-1" : "flex-1 pb-24"}>
        {children}
      </main>
      {!isFullscreen && <BottomNav />}
    </div>
  );
}
