import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/app/(auth)/signup/signup-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Track milestones and collect payments in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
