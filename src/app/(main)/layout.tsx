"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNav } from "@/components/shared/bottom-nav";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { useAuthStore } from "@/auth/authStore";

const FULLSCREEN_ROUTES = ["/workout/active"];

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
      router.replace("/login");
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
      {/* The active workout has its own sync bar. */}
      {!isFullscreen && <OfflineBanner />}
      <main className={isFullscreen ? "flex-1" : "flex-1 pb-24"}>
        {children}
      </main>
      {!isFullscreen && <BottomNav />}
    </div>
  );
}
