"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

interface PaymentButtonProps {
  token: string;
  position: number;
  amount: number;
  currency: string;
  /** Demo mode renders the button but never contacts Razorpay. */
  demo?: boolean;
}

export function PaymentButton({
  token,
  position,
  amount,
  currency,
  demo = false,
}: PaymentButtonProps) {
  const [pending, setPending] = React.useState(false);

  async function startPayment() {
    if (demo) {
      toast.info("This is a demo project — payments are disabled.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/public/${token}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position }),
      });

      const result: unknown = await response.json().catch(() => null);
      const url = readString(result, "url");

      if (!response.ok || !url) {
        toast.error(
          readString(result, "error") ?? "Could not start the payment. Try again.",
        );
        setPending(false);
        return;
      }

      window.location.href = url;
    } catch {
      toast.error("Could not reach the payment service. Check your connection.");
      setPending(false);
    }
  }

  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full sm:w-auto"
      disabled={pending}
      onClick={startPayment}
    >
      {pending ? "Opening…" : `Pay ${formatMoney(amount, currency)}`}
    </Button>
  );
}

function readString(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null) return null;
  const found = (value as Record<string, unknown>)[key];
  return typeof found === "string" && found !== "" ? found : null;
}
