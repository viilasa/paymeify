import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free to start. Pro at ₹399/month for unlimited projects.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    url: "https://www.paymeify.com/pricing",
    title: "Pricing · Paymeify",
    description: "Free to start. Pro at ₹399/month for unlimited projects.",
  },
};

const upgradeMail =
  "mailto:hello@paymeify.com?subject=" +
  encodeURIComponent("Upgrade to Pro · ₹399/month");

export default function PricingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 pt-10 pb-16 sm:px-5 sm:pt-16 sm:pb-24">
          <p className="text-[12px] font-medium tracking-[0.08em] text-subtle-foreground uppercase">
            Pricing
          </p>
          <h1 className="mt-3 max-w-xl text-[28px] leading-tight font-semibold tracking-tight sm:text-[36px]">
            Simple plans. Start free.
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Two options. No percentage on client payments — gateway fees stay
            with Razorpay or Stripe.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
            <PlanCard
              name={PLANS.free.name}
              price={PLANS.free.priceLabel}
              period={PLANS.free.period}
              blurb={PLANS.free.blurb}
              features={[...PLANS.free.features]}
              cta={
                <Button asChild variant="secondary" size="lg" className="h-11 w-full">
                  <Link href="/signup">Start for free</Link>
                </Button>
              }
            />
            <PlanCard
              name={PLANS.pro.name}
              price={PLANS.pro.priceLabel}
              period={PLANS.pro.period}
              blurb={PLANS.pro.blurb}
              features={[...PLANS.pro.features]}
              emphasized
              cta={
                <Button asChild variant="primary" size="lg" className="h-11 w-full">
                  <a href={upgradeMail}>Get Pro</a>
                </Button>
              }
            />
          </div>

          <p className="mt-8 text-[13px] text-subtle-foreground">
            Already on Free and need more projects? Email{" "}
            <a
              href={upgradeMail}
              className="text-foreground underline-offset-2 hover:underline"
            >
              hello@paymeify.com
            </a>{" "}
            and we will enable Pro on your account.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  blurb,
  features,
  cta,
  emphasized,
}: {
  name: string;
  price: string;
  period: string;
  blurb: string;
  features: string[];
  cta: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <div
      className={
        emphasized
          ? "flex flex-col rounded-card border border-foreground/20 bg-card p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)]"
          : "flex flex-col rounded-card border border-border bg-card p-6"
      }
    >
      <h2 className="text-[15px] font-medium">{name}</h2>
      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="text-[32px] font-semibold tracking-tight">{price}</span>
        <span className="text-[13px] text-subtle-foreground">{period}</span>
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{blurb}</p>
      <ul className="mt-6 flex-1 space-y-2.5 text-[13px] text-muted-foreground">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8">{cta}</div>
    </div>
  );
}
