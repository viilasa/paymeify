"use server";

import { redirect } from "next/navigation";

import { failure, success, type ActionState } from "@/lib/action-result";
import { appUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fieldErrorsFrom,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation";

/** Only allow same-origin relative paths as post-login destinations. */
function safeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: `${appUrl()}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return failure(
      error.message.toLowerCase().includes("already registered")
        ? "An account with that email already exists."
        : error.message,
    );
  }

  // No session means the project requires email confirmation.
  if (!data.session) {
    return success("Check your inbox to confirm your email, then log in.");
  }

  redirect("/dashboard");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return failure(
      error.status === 400
        ? "Incorrect email or password."
        : "Could not sign you in. Try again in a moment.",
    );
  }

  redirect(safeNext(formData.get("next")));
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
  });

  // Always the same response, so this cannot be used to probe for accounts.
  return success("If that email has an account, a reset link is on its way.");
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return failure("This reset link has expired. Request a new one.");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return failure(error.message);

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
