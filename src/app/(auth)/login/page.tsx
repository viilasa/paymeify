import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormBanner } from "@/components/form-banner";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Paymeify to manage projects, milestones, and payments.",
  alternates: { canonical: "/login" },
  openGraph: {
    url: "https://www.paymeify.com/login",
    title: "Log in · Paymeify",
    description: "Log in to Paymeify to manage projects, milestones, and payments.",
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back."
      footer={
        <>
          No account?{" "}
          <Link href="/signup" className="text-foreground underline underline-offset-4">
            Sign up
          </Link>
        </>
      }
    >
      {error ? (
        <div className="mb-4">
          <FormBanner error={error} />
        </div>
      ) : null}
      <LoginForm next={destination} />
    </AuthShell>
  );
}
