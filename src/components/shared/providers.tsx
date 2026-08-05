"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthBootstrap } from "@/auth/authBootstrap";
import { WorkoutSyncManager } from "@/components/shared/workout-sync-manager";

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
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
