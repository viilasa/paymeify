import type { ReactNode } from "react";
import Link from "next/link";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { graphJsonLd } from "@/lib/seo";

const upgradeMail =
  "mailto:hello@paymeify.com?subject=" +
  encodeURIComponent("Upgrade to Pro · ₹399/month");

const steps = [
  {
    step: "01",
    title: "Create the project",
    body: "Name the client, split the work into milestones, and put an amount on each one.",
  },
  {
    step: "02",
    title: "Share one link",
    body: "Send the private project page. Your client opens it — no account, no login, no app.",
  },
  {
    step: "03",
    title: "Get paid as you deliver",
    body: "They pay the current milestone. Automatic checkout marks itself paid. UPI waits for you.",
  },
];

const payments = [
  {
    name: "UPI / GPay",
    detail: "India · INR",
    body: "Paste your VPA. The client scans a QR. They can tap “I have paid.” You confirm it after you see the money.",
  },
  {
    name: "Razorpay",
    detail: "Automatic · INR",
    body: "Connect your own keys in Settings. A signed webhook is the only thing that marks the milestone paid.",
  },
  {
    name: "Stripe",
    detail: "Automatic · other currencies",
    body: "Same idea for work billed outside rupees. Checkout Session, then a signed webhook.",
  },
];

const features = [
  {
    title: "Milestone-based payments",
    body: "Each milestone has its own amount and is paid in order. The next one unlocks when the current one is settled.",
  },
  {
    title: "A portal clients understand",
    body: "Progress, amounts, and what is due next — on one page that works on a phone.",
  },
  {
    title: "Payment status you can trust",
    body: "A client click never marks a milestone paid. Only a signed webhook or your confirmation does.",
  },
  {
    title: "Your keys, your money",
    body: "Razorpay and Stripe go to your account. Paymeify never takes a cut and never holds funds.",
  },
  {
    title: "Works without a gateway",
    body: "UPI needs no onboarding. Share the link, they scan, you confirm. Enough for most India work.",
  },
  {
    title: "Nothing else",
    body: "No boards, no tickets, no time tracking. Create the project, track delivery, get paid.",
  },
];

const faqs = [
  {
    q: "Do my clients need an account?",
    a: "No. They open one private link. That is the whole client experience.",
  },
  {
    q: "Does Paymeify take the money?",
    a: "No. UPI lands in your bank. Razorpay and Stripe settle to the account you connected. We never hold client funds.",
  },
  {
    q: "Can a client fake a UPI payment?",
    a: "They can press “I have paid.” That is only a claim. The milestone stays unpaid until you confirm it, or a signed Razorpay/Stripe webhook arrives.",
  },
  {
    q: "Is it free?",
    a: "Yes — start on Free. Pro is ₹399/month if you need more. Gateway fees are whatever Razorpay or Stripe already charge on your account.",
  },
  {
    q: "Who is this for?",
    a: "Freelancers and small studios who bill by milestone — websites, design, video, retainers split into stages.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graphJsonLd()) }}
      />
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-5xl gap-10 px-4 pt-10 pb-14 sm:px-5 sm:pt-20 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center lg:gap-16">
          <div>
            <p className="text-[12px] font-medium tracking-[0.08em] text-subtle-foreground uppercase">
              For freelancers
            </p>
            <h1 className="mt-3 max-w-xl text-[30px] leading-[1.15] font-semibold tracking-tight text-balance sm:text-[44px]">
              Projects delivered. Payments tracked.
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-pretty text-muted-foreground sm:text-[16px]">
              Create milestones, share one project link, and get paid as you
              deliver — UPI, Razorpay, or Stripe. Clients never make an account.
            </p>
            <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <Button asChild variant="primary" size="lg" className="h-11 w-full sm:w-auto">
                <Link href="/signup">Start for free</Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="h-11 w-full sm:w-auto">
                <Link href="/demo">View client demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-[12px] text-subtle-foreground">
              Free to start.{" "}
              <a href="#pricing" className="underline-offset-2 hover:underline">
                See pricing
              </a>
              . No card. Your payment keys stay yours.
            </p>
          </div>

          <LandingPreview />
        </section>

        <Section title="How it works">
          <div className="grid gap-px overflow-hidden rounded-card border border-border bg-border sm:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="bg-card p-5">
                <span className="font-mono text-[11px] text-subtle-foreground">{item.step}</span>
                <h3 className="mt-3 text-[15px] font-medium">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Payments"
          lede="Connect what you already use. India can start with UPI alone. Automatic settlement is optional."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {payments.map((item) => (
              <div key={item.name} className="rounded-card border border-border bg-card p-5">
                <h3 className="text-[15px] font-medium">{item.name}</h3>
                <p className="mt-1 text-[12px] text-subtle-foreground">{item.detail}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="What you get">
          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title}>
                <dt className="text-[15px] font-medium">{feature.title}</dt>
                <dd className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {feature.body}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <section id="pricing" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-5 sm:py-16">
            <h2 className="text-[13px] font-medium text-muted-foreground">Pricing</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-pretty text-muted-foreground">
              Two plans. No percentage on client payments — gateway fees stay
              with Razorpay or Stripe.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5">
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
            <p className="mt-6 text-[13px] text-subtle-foreground">
              Need Pro? Email{" "}
              <a
                href={upgradeMail}
                className="text-foreground underline-offset-2 hover:underline"
              >
                hello@paymeify.com
              </a>{" "}
              and we will enable it on your account.
            </p>
          </div>
        </section>

        <Section
          title="What it is not"
          lede="Paymeify is not a wallet, marketplace, or escrow. We do not take a percentage and we do not sit in the middle of the transfer."
        >
          <ul className="grid gap-3 text-[13px] leading-relaxed text-muted-foreground sm:grid-cols-2">
            <li className="rounded-card border border-border bg-card px-4 py-3.5">
              Money goes to your UPI ID or your Razorpay / Stripe account.
            </li>
            <li className="rounded-card border border-border bg-card px-4 py-3.5">
              “I have paid” is a report, not a receipt. You still confirm UPI.
            </li>
            <li className="rounded-card border border-border bg-card px-4 py-3.5">
              Clients pay one milestone at a time, in the order you set.
            </li>
            <li className="rounded-card border border-border bg-card px-4 py-3.5">
              The project link is private. Anyone with it can see amounts and pay.
            </li>
          </ul>
        </Section>

        <Section title="Questions">
          <dl className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
            {faqs.map((item) => (
              <div key={item.q} className="px-4 py-4 sm:px-5">
                <dt className="text-[14px] font-medium text-foreground">{item.q}</dt>
                <dd className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <section className="border-t border-border">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-16">
            <div>
              <h2 className="text-[20px] font-medium tracking-tight text-balance sm:text-[22px]">
                Send your next project link today.
              </h2>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Free to start. No card required.
              </p>
            </div>
            <Button asChild variant="primary" size="lg" className="h-11 w-full sm:w-auto">
              <Link href="/signup">Start for free</Link>
            </Button>
          </div>
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
      <h3 className="text-[15px] font-medium">{name}</h3>
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

function Section({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-5 sm:py-16">
        <h2 className="text-[13px] font-medium text-muted-foreground">{title}</h2>
        {lede ? (
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-pretty text-muted-foreground">
            {lede}
          </p>
        ) : null}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function LandingPreview() {
  const rows = [
    { n: "01", title: "Discovery", amount: "₹15,000", paid: true },
    { n: "02", title: "Design", amount: "₹20,000", paid: false, current: true },
    { n: "03", title: "Build", amount: "₹25,000", paid: false },
  ];

  return (
    <aside
      aria-hidden="true"
      className="rounded-card border border-border bg-card p-4 sm:p-5"
    >
      <p className="text-[11px] text-subtle-foreground">ABC Studio</p>
      <p className="mt-1 text-[16px] font-medium tracking-tight">Website redesign</p>
      <p className="mt-4 text-[11px] tracking-[0.08em] text-subtle-foreground">PROGRESS</p>
      <p className="tabular mt-1.5 text-[24px] font-medium">33%</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-elevated">
        <div className="h-full w-1/3 rounded-full bg-foreground" />
      </div>
      <ul className="mt-5 space-y-2">
        {rows.map((row) => (
          <li
            key={row.n}
            className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2.5 ${
              row.current ? "border-border-strong bg-elevated" : "border-border"
            }`}
          >
            <span className="min-w-0">
              <span className="font-mono text-[10px] text-subtle-foreground">{row.n}</span>
              <span className="ml-2 text-[13px] font-medium">{row.title}</span>
            </span>
            <span className="tabular shrink-0 text-[12px] text-muted-foreground">
              {row.paid ? <span className="text-success">Paid</span> : row.amount}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
