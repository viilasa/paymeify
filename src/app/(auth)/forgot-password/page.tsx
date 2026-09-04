import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/forgot-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Back to log in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
