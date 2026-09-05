import type { Metadata } from "next";

import { PageHeader } from "@/components/app/page-header";
import { ProfileForm } from "@/app/(app)/settings/profile-form";
import { requireSession } from "@/lib/auth";
import { isRazorpayConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile } = await requireSession();
  const razorpayReady = isRazorpayConfigured();
  const upiReady = Boolean(profile.upi_id);

  return (
    <div className="space-y-10">
      <PageHeader title="Settings" />

      <section className="space-y-4">
        <h2 className="text-[13px] font-medium">Profile</h2>
        <ProfileForm profile={profile} />
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-medium">How you get paid</h2>
        <div className="max-w-md space-y-3">
          <Method
            name="UPI"
            connected={upiReady}
            connectedLabel={profile.upi_id ?? undefined}
            description={
              upiReady
                ? "Clients see a QR they can scan with any UPI app. The money reaches your bank directly, so you confirm each transfer yourself once it lands."
                : "Add your UPI ID above and clients can pay by scanning a QR. Nothing to sign up for."
            }
          />
          <Method
            name="Razorpay"
            connected={razorpayReady}
            description={
              razorpayReady
                ? "Payment links are live. These are confirmed automatically by a signed webhook, so paid milestones update on their own."
                : "Optional. Needs a registered business and KYC, but once set up it confirms payments automatically instead of you checking your bank."
            }
          />
        </div>
        {!upiReady && !razorpayReady ? (
          <p className="max-w-md text-[12px] leading-relaxed text-warning">
            Clients cannot pay you yet. Adding a UPI ID is the quickest fix.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Method({
  name,
  connected,
  connectedLabel,
  description,
}: {
  name: string;
  connected: boolean;
  connectedLabel?: string;
  description: string;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px]">{name}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[11px] font-medium",
            connected ? "text-success" : "text-muted-foreground",
          )}
        >
          <span
            className={cn("size-1.5 rounded-full", connected ? "bg-success" : "bg-[#3a3a3a]")}
          />
          {connected ? "Ready" : "Not set up"}
        </span>
      </div>
      {connectedLabel ? (
        <p className="mt-1.5 font-mono text-[12px] text-muted-foreground">{connectedLabel}</p>
      ) : null}
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
