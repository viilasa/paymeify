import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-password-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { noIndexRobots } from "@/lib/seo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: noIndexRobots,
  alternates: { canonical: "/reset-password" },
};

export default async function ResetPasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthShell
        title="Link expired"
        subtitle="Password reset links can only be used once, and they expire quickly."
        footer={
          <Link
            href="/forgot-password"
            className="text-foreground underline underline-offset-4"
          >
            Request a new link
          </Link>
        }
      >
        <p className="text-[13px] text-muted-foreground">
          Request a fresh link and open it from the same browser.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle={`Signed in as ${user.email}.`}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
