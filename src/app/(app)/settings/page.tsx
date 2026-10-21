import type { Metadata } from "next";

import { PageHeader } from "@/components/app/page-header";
import { ProfileForm } from "@/app/(app)/settings/profile-form";
import { IntegrationsPanel } from "@/components/settings/integrations-panel";
import { requireSession } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { listMyConnections } from "@/lib/payments/connections";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [{ profile }, connections] = await Promise.all([
    requireSession(),
    listMyConnections(),
  ]);
  const razorpay = connections.find((c) => c.provider === "razorpay") ?? null;
  const stripe = connections.find((c) => c.provider === "stripe") ?? null;
  const dodo = connections.find((c) => c.provider === "dodo") ?? null;
  const origin = appUrl();

  return (
    <div className="space-y-10">
      <PageHeader title="Settings" />

      <section className="space-y-4">
        <h2 className="text-[13px] font-medium">Profile</h2>
        <ProfileForm profile={profile} />
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-medium">Integrations</h2>
        <p className="max-w-xl text-[12px] leading-relaxed text-muted-foreground">
          UPI stays manual. Razorpay, Stripe, and Dodo Payments mark a milestone
          paid when checkout finishes. Dodo covers any currency without its own
          gateway connected.
        </p>
        <IntegrationsPanel
          profile={profile}
          razorpay={razorpay}
          stripe={stripe}
          dodo={dodo}
          webhookOrigin={origin}
        />
      </section>
    </div>
  );
}
