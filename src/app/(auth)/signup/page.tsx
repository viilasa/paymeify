import Link from "next/link";

import { SignupForm } from "@/app/(auth)/signup/signup-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "Sign up",
  description:
    "Create a free Paymeify account. Track milestones, share one client link, and get paid by UPI or Razorpay.",
  path: "/signup",
});

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
