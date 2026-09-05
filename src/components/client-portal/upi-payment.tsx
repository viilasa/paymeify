"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, QrCode, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";

interface UpiPaymentProps {
  token: string;
  position: number;
  amount: number;
  currency: string;
  upiId: string;
  /** `upi://pay?...` deep link, built on the server. */
  upiUri: string;
  /** Inline SVG markup for the QR, rendered on the server. */
  qrSvg: string;
  /** The client already told us about a transfer for this milestone. */
  reported: boolean;
  demo?: boolean;
}

export function UpiPayment({
  token,
  position,
  amount,
  currency,
  upiId,
  upiUri,
  qrSvg,
  reported,
  demo = false,
}: UpiPaymentProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reference, setReference] = React.useState("");
  const [pending, setPending] = React.useState(false);

  if (reported) return <ReportedNotice />;

  async function report() {
    if (demo) {
      toast.info("This is a demo project — payments are disabled.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(`/api/public/${token}/report-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position, reference }),
      });

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(readString(result, "error") ?? "Could not record that. Try again.");
        setPending(false);
        return;
      }

      toast.success("Thanks — we have let them know.");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        <QrCode />
        Pay {formatMoney(amount, currency)}
      </Button>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* White plate: QR codes need light backgrounds to scan reliably. */}
        <div
          className="size-[168px] shrink-0 rounded-[10px] bg-white p-2.5 [&>svg]:size-full"
          // Markup comes from the QR encoder on the server, not from user input.
          dangerouslySetInnerHTML={{ __html: qrSvg }}
          role="img"
          aria-label={`UPI QR code to pay ${formatMoney(amount, currency)} to ${upiId}`}
        />

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[13px] font-medium">
            Scan to pay {formatMoney(amount, currency)}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            Open GPay, PhonePe, Paytm, or any UPI app and scan this code. The amount is
            already filled in.
          </p>

          <div className="mt-3.5 flex flex-col items-center gap-2 sm:items-start">
            <div className="flex items-center gap-2">
              <code className="rounded-[6px] border border-border bg-surface px-2 py-1 font-mono text-[12px] text-muted-foreground">
                {upiId}
              </code>
              <CopyButton size="sm" value={upiId} label="Copy" toastMessage="UPI ID copied" />
            </div>

            {/* Pointless on desktop — no UPI app to hand off to. */}
            <Button asChild size="sm" variant="secondary" className="sm:hidden">
              <a href={upiUri}>
                <Smartphone />
                Open UPI app
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-[12px] font-medium">Already paid?</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          Let them know so they can confirm it. Add the UPI reference number if you have
          it — it makes checking faster.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Reference number (optional)"
            maxLength={64}
            autoCapitalize="characters"
            spellCheck={false}
            className="sm:max-w-[220px]"
          />
          <Button variant="primary" disabled={pending} onClick={report}>
            {pending ? "Sending…" : "I have paid"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReportedNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-[8px] border border-border bg-surface px-3.5 py-3">
      <Check className="mt-px size-3.5 shrink-0 text-muted-foreground" />
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        You reported this payment. It will show as paid once they have confirmed it
        against their bank.
      </p>
    </div>
  );
}

function readString(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null) return null;
  const found = (value as Record<string, unknown>)[key];
  return typeof found === "string" && found !== "" ? found : null;
}
