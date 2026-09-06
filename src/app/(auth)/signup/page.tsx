import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/app/(auth)/signup/signup-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormBanner } from "@/components/form-banner";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Paymeify account and start collecting milestone payments.",
  alternates: { canonical: "/signup" },
  openGraph: {
    url: "https://www.paymeify.com/signup",
    title: "Sign up · Paymeify",
    description: "Create a Paymeify account and start collecting milestone payments.",
  },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
      {error ? (
        <div className="mb-4">
          <FormBanner error={error} />
        </div>
      ) : null}
      <SignupForm />
    </AuthShell>
  );
}
