"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNav } from "@/components/shared/bottom-nav";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { useAuthStore } from "@/auth/authStore";
import { fetchProfile } from "@/lib/api/profile";

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
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const isFullscreen = FULLSCREEN_ROUTES.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (!_hasHydrated) return;
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [_hasHydrated, status, router]);

  // A refreshed session has no user object (only login returns one), so
  // fetch it once to learn whether onboarding is still due. Offline or on
  // error the check is skipped rather than blocking the app.
  useEffect(() => {
    if (status !== "authenticated" || user) return;
    let cancelled = false;
    fetchProfile()
      .then((profile) => {
        if (!cancelled) setUser({ id: profile.id, onboarded_at: profile.onboarded_at });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, user, setUser]);

  useEffect(() => {
    if (status === "authenticated" && user?.onboarded_at === null) {
      router.replace("/onboarding");
    }
  }, [status, user, router]);

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
