import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const steps = [
  {
    step: "01",
    title: "Create the project",
    body: "Add your client and break the work into milestones with an amount on each one.",
  },
  {
    step: "02",
    title: "Share one link",
    body: "Send the private project link. Your client opens it — no account, no login, no app.",
  },
  {
    step: "03",
    title: "Get paid as you deliver",
    body: "Your client pays the current milestone. It flips to paid the moment Razorpay confirms it.",
  },
];

const features = [
  {
    title: "Milestone-based payments",
    body: "Every milestone carries its own amount and its own payment link.",
  },
  {
    title: "A portal clients understand",
    body: "Progress, amounts, and what is due next — on one page that works on a phone.",
  },
  {
    title: "Payment status you can trust",
    body: "Status changes only on a verified Razorpay webhook. Never on a click.",
  },
  {
    title: "Nothing else",
    body: "No boards, no tickets, no time tracking. Create, track, get paid.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5">
          <Logo />
          <nav className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="primary" size="sm">
              <Link href="/signup">Start for free</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-5xl px-5 pt-20 pb-20 sm:pt-28 sm:pb-24">
          <h1 className="max-w-2xl text-[32px] leading-[1.15] font-semibold tracking-tight text-balance sm:text-[44px]">
            Projects delivered. Payments tracked.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Create milestones, share one project link, and get paid as you deliver.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <Button asChild variant="primary" size="lg">
              <Link href="/signup">Start for free</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/demo">View demo</Link>
            </Button>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <h2 className="text-[13px] font-medium text-muted-foreground">
              How it works
            </h2>
            <div className="mt-8 grid gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-3">
              {steps.map((item) => (
                <div key={item.step} className="bg-card p-5">
                  <span className="font-mono text-[11px] text-subtle-foreground">
                    {item.step}
                  </span>
                  <h3 className="mt-3 text-[14px] font-medium">{item.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <h2 className="text-[13px] font-medium text-muted-foreground">
              What you get
            </h2>
            <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature.title}>
                  <dt className="text-[14px] font-medium">{feature.title}</dt>
                  <dd className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {feature.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-16 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[20px] font-medium tracking-tight">
                Send your next project link today.
              </h2>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Free to start. No card required.
              </p>
            </div>
            <Button asChild variant="primary" size="lg" className="w-fit">
              <Link href="/signup">Start for free</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 py-6 text-[12px] text-subtle-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Paymeify</span>
          <div className="flex items-center gap-4">
            <Link href="/demo" className="transition-colors hover:text-foreground">
              Demo
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Log in
            </Link>
            <Link href="/signup" className="transition-colors hover:text-foreground">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
