"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/auth/authStore";
import { postLoginPath } from "@/auth/postLoginPath";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (status === "authenticated") {
      router.replace(postLoginPath(user));
    }
  }, [_hasHydrated, status, user, router]);

  if (!_hasHydrated || status === "loading" || status === "authenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {children}
    </div>
  );
}
