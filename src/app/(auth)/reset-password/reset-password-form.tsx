"use client";

import { useActionState } from "react";

import { resetPasswordAction } from "@/app/(auth)/actions";
import { FormBanner } from "@/components/form-banner";
import { SubmitButton } from "@/components/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { emptyActionState } from "@/lib/action-result";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(resetPasswordAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="New password"
        htmlFor="password"
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="confirmPassword"
        error={state.fieldErrors?.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <FormBanner error={state.error} message={state.message} />

      <SubmitButton variant="primary" className="w-full" pendingLabel="Saving…">
        Update password
      </SubmitButton>
    </form>
  );
}
