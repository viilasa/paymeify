"use client";

import { useActionState } from "react";
import Link from "next/link";

import { loginAction } from "@/app/(auth)/actions";
import { AuthDivider, GoogleAuthButton } from "@/components/auth/google-auth-button";
import { FormBanner } from "@/components/form-banner";
import { SubmitButton } from "@/components/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { emptyActionState } from "@/lib/action-result";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(loginAction, emptyActionState);

  return (
    <div className="space-y-4">
      <GoogleAuthButton next={next} label="Continue with Google" />
      <AuthDivider />
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

      <SubmitButton variant="primary" className="h-11 w-full sm:h-8" pendingLabel="Signing in…">
        Log in
      </SubmitButton>

      <div className="text-center">
        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 items-center text-[12px] text-subtle-foreground transition-colors hover:text-foreground sm:min-h-0"
        >
          Forgot password?
        </Link>
      </div>
      </form>
    </div>
  );
}
