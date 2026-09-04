"use client";

import { useActionState } from "react";

import { signupAction } from "@/app/(auth)/actions";
import { FormBanner } from "@/components/form-banner";
import { SubmitButton } from "@/components/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { emptyActionState } from "@/lib/action-result";

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Ananya Rao"
          required
        />
      </Field>

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

      <Field
        label="Password"
        htmlFor="password"
        hint="At least 8 characters."
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          required
        />
      </Field>

      <FormBanner error={state.error} message={state.message} />

      <SubmitButton variant="primary" className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
