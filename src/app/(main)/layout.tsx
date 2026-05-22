"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/shared/bottom-nav";

const FULLSCREEN_ROUTES = ["/workout/active"];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_ROUTES.some((route) => pathname.startsWith(route));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className={isFullscreen ? "flex-1" : "flex-1 pb-24"}>
        {children}
      </main>
      {!isFullscreen && <BottomNav />}
    </div>
  );
}
