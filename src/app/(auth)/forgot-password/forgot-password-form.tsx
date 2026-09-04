"use client";

import { useActionState } from "react";

import { forgotPasswordAction } from "@/app/(auth)/actions";
import { FormBanner } from "@/components/form-banner";
import { SubmitButton } from "@/components/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { emptyActionState } from "@/lib/action-result";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@studio.com"
          required
        />
      </Field>

      <FormBanner error={state.error} message={state.message} />

      <SubmitButton variant="primary" className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
