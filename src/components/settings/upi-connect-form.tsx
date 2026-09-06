"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { updateUpiAction } from "@/app/(app)/settings/actions";
import { FormBanner } from "@/components/form-banner";
import { SubmitButton } from "@/components/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { emptyActionState } from "@/lib/action-result";
import type { Profile } from "@/lib/supabase/types";

export function UpiConnectForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateUpiAction, emptyActionState);

  const lastMessage = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message;
      toast.success(state.message);
    }
  }, [state.message]);

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Clients scan a QR and pay this VPA directly. You confirm it on the dashboard.
        Leave blank to turn UPI off.
      </p>

      <Field label="UPI ID" htmlFor="integration-upi" error={state.fieldErrors?.upi_id}>
        <Input
          id="integration-upi"
          name="upi_id"
          defaultValue={profile.upi_id ?? ""}
          maxLength={128}
          placeholder="you@okhdfcbank"
          autoCapitalize="none"
          spellCheck={false}
        />
      </Field>

      <FormBanner error={state.error} />

      <SubmitButton variant="primary" pendingLabel="Saving…">
        Save UPI ID
      </SubmitButton>
    </form>
  );
}
