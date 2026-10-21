"use client";

import * as React from "react";
import type { ReactNode } from "react";

import { GatewayConnectForm } from "@/components/settings/gateway-connect-form";
import {
  DodoLogo,
  GPayLogo,
  RazorpayLogo,
  StripeLogo,
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
  dodo,
  webhookOrigin,
}: {
  profile: Profile;
  razorpay: PaymentConnectionPublic | null;
  stripe: PaymentConnectionPublic | null;
  dodo: PaymentConnectionPublic | null;
  webhookOrigin: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <IntegrationCard
        logo={<GPayLogo />}
        name="GPay"
        detail="UPI · India · manual"
        status={profile.upi_id ? profile.upi_id : "Not connected"}
        connected={Boolean(profile.upi_id)}
        action={profile.upi_id ? "Manage" : "Connect"}
        title="Connect GPay / UPI"
        description="Your own VPA. Clients pay in GPay or any UPI app. You confirm it."
      >
        <UpiConnectForm profile={profile} />
      </IntegrationCard>

      <IntegrationCard
        logo={<RazorpayLogo />}
        name="Razorpay"
        detail="Automatic · INR"
        status={connectionStatus(razorpay)}
        connected={razorpay?.status === "connected"}
        action={razorpay ? "Manage" : "Connect"}
        title="Connect Razorpay"
        description="For rupee projects. Paste keys, add the webhook, and checkout marks the milestone paid."
      >
        {(close) => (
        <GatewayConnectForm
          provider="razorpay"
          onDone={close}
          keyLabel="Key ID"
          secretLabel="Key secret"
          webhookUrl={`${webhookOrigin}/api/webhooks/razorpay`}
          hint="In Razorpay, add this webhook URL and subscribe to payment_link.paid, expired, and cancelled."
          connection={razorpay}
        />
        )}
      </IntegrationCard>

      <IntegrationCard
        logo={<StripeLogo />}
        name="Stripe"
        detail="Automatic · other currencies"
        status={connectionStatus(stripe)}
        connected={stripe?.status === "connected"}
        action={stripe ? "Manage" : "Connect"}
        title="Connect Stripe"
        description="For projects not in rupees. Checkout Session plus a signed webhook."
      >
        {(close) => (
        <GatewayConnectForm
          provider="stripe"
          onDone={close}
          keyLabel="Publishable key (optional)"
          secretLabel="Secret key"
          webhookUrl={`${webhookOrigin}/api/webhooks/stripe`}
          hint="In Stripe, add this endpoint and subscribe to checkout.session.completed and checkout.session.expired."
          connection={stripe}
        />
        )}
      </IntegrationCard>

      <IntegrationCard
        logo={<DodoLogo />}
        name="Dodo Payments"
        detail="Automatic · any currency"
        status={connectionStatus(dodo, " mode")}
        connected={dodo?.status === "connected"}
        action={dodo ? "Manage" : "Connect"}
        title="Connect Dodo Payments"
        description="Merchant of record for global clients. Used for any project Razorpay or Stripe is not connected for."
      >
        {(close) => (
        <GatewayConnectForm
          provider="dodo"
          onDone={close}
          secretLabel="API key"
          webhookUrl={`${webhookOrigin}/api/webhooks/dodo`}
          hint="In Dodo Payments, open Developer → Webhooks, add this endpoint, subscribe to payment.succeeded and payment.cancelled, then copy its signing secret. Live or test mode is detected from the API key."
          connection={dodo}
        />
        )}
      </IntegrationCard>
    </div>
  );
}

function connectionStatus(connection: PaymentConnectionPublic | null, suffix = ""): string {
  if (!connection) return "Not connected";
  if (connection.status !== "connected") return "Keys need attention · reconnect";
  return `Connected · ${connection.keyHint}${suffix}`;
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
  /** Render prop so a form can close the dialog when it succeeds. */
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

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

      <Dialog open={open} onOpenChange={setOpen}>
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
          {typeof children === "function" ? children(close) : children}
        </DialogContent>
      </Dialog>
    </div>
  );
}
