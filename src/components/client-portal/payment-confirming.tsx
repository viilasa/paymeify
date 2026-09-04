"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Razorpay redirects the client back before its webhook has necessarily
 * landed. Poll a few times so the page settles on the confirmed state by
 * itself, then stop.
 */
export function PaymentConfirming({ attempts = 8, intervalMs = 4000 }) {
  const router = useRouter();

  React.useEffect(() => {
    let remaining = attempts;
    const id = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) window.clearInterval(id);
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [router, attempts, intervalMs]);

  return null;
}
