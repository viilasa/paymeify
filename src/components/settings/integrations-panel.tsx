"use client";

import type { ReactNode } from "react";

import { GatewayConnectForm } from "@/components/settings/gateway-connect-form";
import {
  RazorpayLogo,
  StripeLogo,
  UpiLogo,
} from "@/components/settings/integration-logos";
import { UpiConnectForm } from "@/components/settings/upi-connect-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type {
  PaymentConnectionPublic,
  Profile,
} from "@/lib/supabase/types";

export function IntegrationsPanel({
  profile,
  razorpay,
  stripe,
  webhookOrigin,
}: {
  profile: Profile;
  razorpay: PaymentConnectionPublic | null;
  stripe: PaymentConnectionPublic | null;
  webhookOrigin: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <IntegrationCard
        logo={<UpiLogo />}
        name="UPI / GPay"
        detail="Manual · India"
        status={profile.upi_id ? profile.upi_id : "Not connected"}
        connected={Boolean(profile.upi_id)}
        action={profile.upi_id ? "Manage" : "Connect"}
        title="Connect UPI"
        description="Your own VPA. No account to open, and nothing marks itself paid."
      >
        <UpiConnectForm profile={profile} />
      </IntegrationCard>

      <IntegrationCard
        logo={<RazorpayLogo />}
        name="Razorpay"
        detail="Automatic · INR"
        status={razorpay ? `Connected · ${razorpay.keyHint}` : "Not connected"}
        connected={Boolean(razorpay)}
        action={razorpay ? "Manage" : "Connect"}
        title="Connect Razorpay"
        description="For rupee projects. Paste keys, add the webhook, and checkout marks the milestone paid."
      >
        <GatewayConnectForm
          provider="razorpay"
          keyLabel="Key ID"
          secretLabel="Key secret"
          webhookUrl={`${webhookOrigin}/api/webhooks/razorpay`}
          hint="In Razorpay, add this webhook URL and subscribe to payment_link.paid, expired, and cancelled."
          connection={razorpay}
        />
      </IntegrationCard>

      <IntegrationCard
        logo={<StripeLogo />}
        name="Stripe"
        detail="Automatic · other currencies"
        status={stripe ? `Connected · ${stripe.keyHint}` : "Not connected"}
        connected={Boolean(stripe)}
        action={stripe ? "Manage" : "Connect"}
        title="Connect Stripe"
        description="For projects not in rupees. Checkout Session plus a signed webhook."
      >
        <GatewayConnectForm
          provider="stripe"
          keyLabel="Publishable key"
          secretLabel="Secret key"
          webhookUrl={`${webhookOrigin}/api/webhooks/stripe`}
          hint="In Stripe, add this endpoint and subscribe to checkout.session.completed and checkout.session.expired."
          connection={stripe}
        />
      </IntegrationCard>
    </div>
  );
}

function IntegrationCard({
  logo,
  name,
  detail,
  status,
  connected,
  action,
  title,
  description,
  children,
}: {
  logo: ReactNode;
  name: string;
  detail: string;
  status: string;
  connected: boolean;
  action: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[10px] border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="size-10 shrink-0 overflow-hidden rounded-[9px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
          {logo}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium">{name}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{detail}</p>
        </div>
      </div>

      <p
        className={
          connected
            ? "mt-4 truncate text-[11px] font-medium text-success"
            : "mt-4 truncate text-[11px] text-muted-foreground"
        }
        title={status}
      >
        {status}
      </p>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant={connected ? "secondary" : "primary"} size="sm" className="mt-3 w-full">
            {action}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[min(88dvh,640px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    </div>
  );
}
