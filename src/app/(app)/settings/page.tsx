import type { Metadata } from "next";

import { PageHeader } from "@/components/app/page-header";
import { ProfileForm } from "@/app/(app)/settings/profile-form";
import { requireSession } from "@/lib/auth";
import { isRazorpayConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile } = await requireSession();
  const razorpayReady = isRazorpayConfigured();

  return (
    <div className="space-y-10">
      <PageHeader title="Settings" />

      <section className="space-y-4">
        <h2 className="text-[13px] font-medium">Profile</h2>
        <ProfileForm profile={profile} />
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-medium">Payments</h2>
        <div className="max-w-md rounded-[10px] border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px]">Razorpay</span>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                razorpayReady ? "text-success" : "text-muted-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  razorpayReady ? "bg-success" : "bg-[#3a3a3a]"
                }`}
              />
              {razorpayReady ? "Connected" : "Not connected"}
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            {razorpayReady
              ? "Payment links are live. Payments are confirmed by a signed Razorpay webhook, never by the browser."
              : "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment to start creating payment links."}
          </p>
        </div>
      </section>
    </div>
  );
}
