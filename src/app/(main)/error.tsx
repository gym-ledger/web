"use client";

import { AppErrorScreen } from "@/components/shared/app-error-screen";

export default function MainError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <AppErrorScreen error={error} retry={retry} />;
}
