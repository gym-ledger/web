"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/archive/old-ui/components/ui/sonner";
import { AuthBootstrap } from "@/auth/authBootstrap";
import { WorkoutSyncManager } from "@/archive/old-ui/components/shared/workout-sync-manager";
import { ServiceWorkerRegister } from "@/archive/old-ui/components/shared/service-worker-register";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        {children}
      </AuthBootstrap>
      <WorkoutSyncManager />
      <ServiceWorkerRegister />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
