import Link from "next/link";

import { FaqList } from "@/components/marketing/faq-list";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { landingFaqs } from "@/lib/content/faq";
import {
  faqJsonLd,
  graphJsonLd,
  howToJsonLd,
  publicPageMetadata,
} from "@/lib/seo";

export const metadata = {
  ...publicPageMetadata({
    title: "Paymeify — Projects delivered. Payments tracked.",
    description:
      "Milestone tracker and payment collector for freelancers in India and worldwide. Create a project, share one private link, and get paid by UPI or Razorpay as you deliver.",
    path: "/",
  }),
  alternates: {
    canonical: "/",
    languages: { "en-IN": "/", en: "/" },
    types: { "text/plain": "/llms.txt" },
  },
};

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
    body: "Your client pays the current milestone by UPI QR or Razorpay. Status updates when the payment is confirmed.",
  },
];

const features = [
  {
    title: "Milestone-based payments",
    body: "Every milestone carries its own amount and its own payment path.",
  },
  {
    title: "A portal clients understand",
    body: "Progress, amounts, and what is due next — on one page that works on a phone.",
  },
  {
    title: "Payment status you can trust",
    body: "UPI waits for you to confirm. Razorpay waits for a verified webhook. Never a client click.",
  },
  {
    title: "Nothing else",
    body: "No boards, no tickets, no time tracking. Create, track, get paid.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={graphJsonLd(howToJsonLd(), faqJsonLd(landingFaqs))} />
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-5 pt-20 pb-20 sm:pt-28 sm:pb-24">
          <p className="mb-3 text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
            For freelancers in India and worldwide
          </p>
          <h1 className="max-w-2xl text-[32px] leading-[1.15] font-semibold tracking-tight text-balance sm:text-[44px]">
            Projects delivered. Payments tracked.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Create milestones, share one project link, and get paid as you
            deliver — by UPI at home, or Razorpay when you need cards.
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

        <section className="border-t border-border" aria-labelledby="how-it-works">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <h2
              id="how-it-works"
              className="text-[13px] font-medium text-muted-foreground"
            >
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

        <section className="border-t border-border" aria-labelledby="what-you-get">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <h2
              id="what-you-get"
              className="text-[13px] font-medium text-muted-foreground"
            >
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

        <section className="border-t border-border" aria-labelledby="payments-india">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <h2
              id="payments-india"
              className="text-[13px] font-medium text-muted-foreground"
            >
              Payments in India, and beyond
            </h2>
            <div className="mt-8 grid gap-10 sm:grid-cols-2">
              <div>
                <h3 className="text-[14px] font-medium">UPI for INR</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  Put your UPI ID in Settings. Clients scan a QR with GPay,
                  PhonePe, Paytm, or any UPI app. The money goes to your bank.
                  You confirm once you see it — no gateway, no KYC, no extra
                  account.
                </p>
              </div>
              <div>
                <h3 className="text-[14px] font-medium">Razorpay when you need it</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  Cards, automatic confirmation, and currencies other than
                  rupees use your own Razorpay account. Status changes only
                  after a verified webhook — never on a click.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border" aria-labelledby="faq">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <div className="flex items-end justify-between gap-4">
              <h2 id="faq" className="text-[13px] font-medium text-muted-foreground">
                Questions
              </h2>
              <Link
                href="/faq"
                className="text-[12px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                All questions
              </Link>
            </div>
            <div className="mt-8">
              <FaqList items={landingFaqs} />
            </div>
          </div>
        </section>

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

      <SiteFooter />
    </div>
  );
}
