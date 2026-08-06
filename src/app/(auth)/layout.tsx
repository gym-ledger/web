"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/auth/authStore";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (status === "authenticated") {
      router.replace("/home");
    }
  }, [_hasHydrated, status, router]);

  if (!_hasHydrated || status === "loading" || status === "authenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {children}
    </div>
  );
}
