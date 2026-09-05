"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/(app)/settings/actions";
import { FormBanner } from "@/components/form-banner";
import { SubmitButton } from "@/components/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { emptyActionState } from "@/lib/action-result";
import type { Profile } from "@/lib/supabase/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateProfileAction, emptyActionState);

  const lastMessage = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message;
      toast.success(state.message);
    }
  }, [state.message]);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <Field label="Name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={profile.name} maxLength={80} required />
      </Field>

      <Field label="Email" htmlFor="email" hint="Contact support to change your email.">
        <Input id="email" value={profile.email} readOnly disabled />
      </Field>

      <Field
        label="Business name"
        htmlFor="business_name"
        hint="Shown to clients at the top of the project link."
        error={state.fieldErrors?.business_name}
      >
        <Input
          id="business_name"
          name="business_name"
          defaultValue={profile.business_name ?? ""}
          maxLength={80}
          placeholder="ABC Studio"
        />
      </Field>

      <Field
        label="UPI ID"
        htmlFor="upi_id"
        hint="Clients scan a QR to pay this directly. Leave blank to skip UPI."
        error={state.fieldErrors?.upi_id}
      >
        <Input
          id="upi_id"
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
        Save changes
      </SubmitButton>
    </form>
  );
}
