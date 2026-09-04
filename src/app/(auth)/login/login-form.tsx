"use client";

import { useActionState } from "react";
import Link from "next/link";

import { loginAction } from "@/app/(auth)/actions";
import { FormBanner } from "@/components/form-banner";
import { SubmitButton } from "@/components/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { emptyActionState } from "@/lib/action-result";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(loginAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

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

      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>

      <FormBanner error={state.error} message={state.message} />

      <SubmitButton variant="primary" className="w-full" pendingLabel="Signing in…">
        Log in
      </SubmitButton>

      <div className="text-center">
        <Link
          href="/forgot-password"
          className="text-[12px] text-subtle-foreground transition-colors hover:text-foreground"
        >
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
