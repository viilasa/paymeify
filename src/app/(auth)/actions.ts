"use server";

import { redirect } from "next/navigation";

import {
  failure,
  success,
  toUserMessage,
  type ActionState,
} from "@/lib/action-result";
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

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function authErrorMessage(error: { message: string; code?: string; status?: number }): string {
  const message = error.message.toLowerCase();
  const code = error.code ?? "";

  if (message.includes("already registered") || code === "user_already_exists") {
    return "An account with that email already exists.";
  }
  if (code === "email_address_invalid" || (message.includes("email") && message.includes("invalid"))) {
    return "Enter a real email address. Addresses on example.com are not accepted.";
  }
  if (code === "over_email_send_rate_limit" || message.includes("rate limit")) {
    return "Too many emails just now. Wait a minute and try again.";
  }
  if (error.status === 400) {
    return "Incorrect email or password.";
  }
  return error.message;
}

function configOrAuthFailure(error: unknown, fallback: string): ActionState {
  if (isNextRedirect(error)) throw error;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Missing environment variable")) {
    return failure(
      "Account services are not configured on this deployment yet. Add the Supabase URL and anon key, then try again.",
    );
  }
  return failure(toUserMessage(error, fallback));
}

export async function signInWithGoogleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const next = safeNext(formData.get("next"));

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("provider is not enabled") || message.includes("unsupported provider")) {
        return failure("Google sign-in is not enabled yet. Turn it on in Supabase Auth → Providers.");
      }
      return failure(authErrorMessage(error));
    }
    if (!data.url) return failure("Could not start Google sign-in. Try again.");
    redirect(data.url);
  } catch (error) {
    return configOrAuthFailure(error, "Could not start Google sign-in. Try again.");
  }
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

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { name: parsed.data.name },
        emailRedirectTo: `${appUrl()}/auth/callback?next=/dashboard`,
      },
    });

    if (error) return failure(authErrorMessage(error));

    // No session means the project requires email confirmation.
    if (!data.session) {
      return success("Check your inbox to confirm your email, then log in.");
    }
  } catch (error) {
    return configOrAuthFailure(error, "Could not create your account. Try again in a moment.");
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

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) return failure(authErrorMessage(error));
  } catch (error) {
    return configOrAuthFailure(error, "Could not sign you in. Try again in a moment.");
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

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${appUrl()}/auth/callback?next=/reset-password`,
    });
  } catch (error) {
    return configOrAuthFailure(
      error,
      "Could not send a reset email. Try again in a moment.",
    );
  }

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

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return failure("This reset link has expired. Request a new one.");
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return failure(error.message);
  } catch (error) {
    return configOrAuthFailure(error, "Could not update your password. Try again.");
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
