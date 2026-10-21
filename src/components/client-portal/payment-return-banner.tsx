"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Banner after a gateway redirect. Never claims "paid" until the server says so.
 * Polls briefly, then switches to a stuck-confirmation message.
 */
export function PaymentReturnBanner({
  milestoneTitle,
  isPaid,
  failed = false,
  hasNext,
  attempts = 8,
  intervalMs = 4000,
}: {
  milestoneTitle: string;
  isPaid: boolean;
  /** The gateway reported a failed or cancelled payment. */
  failed?: boolean;
  hasNext: boolean;
  attempts?: number;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [exhausted, setExhausted] = React.useState(false);

  React.useEffect(() => {
    if (isPaid || failed || exhausted) return;

    let remaining = attempts;
    const id = window.setInterval(() => {
      remaining -= 1;
      router.refresh();
      if (remaining <= 0) {
        window.clearInterval(id);
        setExhausted(true);
      }
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [router, attempts, intervalMs, isPaid, failed, exhausted]);

  if (failed) {
    return (
      <Banner tone="pending">
        That payment for {milestoneTitle} did not go through, and no money was taken by
        Paymeify. You can try again below.
      </Banner>
    );
  }

  if (isPaid) {
    return (
      <Banner tone="success">
        Payment successful. The {milestoneTitle} milestone has been paid.
        {hasNext ? " Your next milestone is below." : ""}
      </Banner>
    );
  }

  if (exhausted) {
    return (
      <Banner tone="pending">
        Still confirming your payment. If money left your account, it will show here
        once it clears — please don&apos;t pay again. If nothing was charged, you can
        try again below.
      </Banner>
    );
  }

  return (
    <Banner tone="pending">
      Confirming your payment — this page updates when the payment clears. Do not
      close this tab yet.
    </Banner>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "success" | "pending";
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={
        tone === "success"
          ? "rounded-card border border-success/25 bg-success-muted px-4 py-3 text-[13px] leading-relaxed text-success"
          : "rounded-card border border-warning/25 bg-warning/10 px-4 py-3 text-[13px] leading-relaxed text-foreground"
      }
    >
      {children}
    </div>
  );
}
