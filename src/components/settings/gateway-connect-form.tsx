"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import {
  connectGatewayAction,
  disconnectGatewayAction,
} from "@/app/(app)/settings/actions";
import { CopyButton } from "@/components/copy-button";
import { FormBanner } from "@/components/form-banner";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { emptyActionState } from "@/lib/action-result";
import { useKeepFormValues } from "@/lib/use-keep-form-values";
import { useServerAction } from "@/lib/use-server-action";
import type { PaymentConnectionPublic, PaymentProvider } from "@/lib/supabase/types";

export function GatewayConnectForm({
  provider,
  keyLabel,
  secretLabel,
  webhookUrl,
  hint,
  connection,
  onDone,
}: {
  provider: PaymentProvider;
  /** Omitted for gateways that authenticate with a single key (Dodo). */
  keyLabel?: string;
  secretLabel: string;
  webhookUrl: string;
  hint: string;
  connection: PaymentConnectionPublic | null;
  /** Called after keys are saved or the account is disconnected. */
  onDone?: () => void;
}) {
  const [state, formAction] = useActionState(connectGatewayAction, emptyActionState);
  const { pending, run } = useServerAction();
  const [confirmDisconnect, setConfirmDisconnect] = React.useState(false);
  const { onSubmit, pending: submitting } = useKeepFormValues(formAction);

  const lastMessage = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message;
      toast.success(state.message);
      onDone?.();
    }
  }, [state.message, onDone]);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="provider" value={provider} />

      <p className="text-[12px] leading-relaxed text-muted-foreground">{hint}</p>

      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-[8px] border border-border bg-surface px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
          {webhookUrl}
        </code>
        <CopyButton size="sm" value={webhookUrl} label="Copy URL" toastMessage="Webhook URL copied" />
      </div>

      {keyLabel ? (
        <Field label={keyLabel} htmlFor={`${provider}-key`} error={state.fieldErrors?.key_id}>
          <Input
            id={`${provider}-key`}
            name="key_id"
            autoCapitalize="none"
            spellCheck={false}
            required={provider === "razorpay"}
            placeholder={provider === "razorpay" ? "rzp_live_…" : "pk_live_…"}
          />
        </Field>
      ) : null}
      <Field label={secretLabel} htmlFor={`${provider}-secret`} error={state.fieldErrors?.secret}>
        <Input
          id={`${provider}-secret`}
          name="secret"
          type="password"
          autoComplete="off"
          required
          placeholder={
            provider === "stripe" ? "sk_live_…" : provider === "dodo" ? "API key" : "Secret"
          }
        />
      </Field>
      <Field
        label="Webhook secret"
        htmlFor={`${provider}-whsec`}
        error={state.fieldErrors?.webhook_secret}
      >
        <Input
          id={`${provider}-whsec`}
          name="webhook_secret"
          type="password"
          autoComplete="off"
          required
          placeholder={provider === "razorpay" ? "Webhook secret" : "whsec_…"}
        />
      </Field>

      <FormBanner error={state.error} />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <SubmitButton variant="primary" pendingLabel="Checking keys…" pending={submitting}>
          {connection ? "Update keys" : "Connect"}
        </SubmitButton>
        {connection ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => setConfirmDisconnect(true)}
          >
            Disconnect
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Disconnect this account?"
        description="Clients won't be able to pay online through it, and its webhook secret is deleted. Projects with an open checkout must be released first."
        confirmLabel="Disconnect"
        destructive
        pending={pending}
        onConfirm={() =>
          run(
            disconnectGatewayAction,
            { provider },
            {
              onSuccess: () => {
                setConfirmDisconnect(false);
                onDone?.();
              },
            },
          )
        }
      />
    </form>
  );
}
