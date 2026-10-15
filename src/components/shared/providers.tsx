"use client";

import { Toaster } from "@/components/ui/sonner";
import { AuthBootstrap } from "@/auth/authBootstrap";
import { WorkoutSyncManager } from "@/components/shared/workout-sync-manager";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthBootstrap>
        {children}
      </AuthBootstrap>
      <WorkoutSyncManager />
      <ServiceWorkerRegister />
      <Toaster position="top-center" richColors />
    </>
  );
}
