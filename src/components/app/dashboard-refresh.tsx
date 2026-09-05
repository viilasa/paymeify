"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/** Pulls the dashboard again so a client “I have paid” shows up here. */
export function DashboardRefresh({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter();

  React.useEffect(() => {
    const id = window.setInterval(() => router.refresh(), intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
