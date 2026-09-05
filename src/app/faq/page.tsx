import Link from "next/link";

import { FaqList } from "@/components/marketing/faq-list";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { allFaqs } from "@/lib/content/faq";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  graphJsonLd,
  publicPageMetadata,
} from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "FAQ",
  description:
    "How Paymeify works for freelancers in India and worldwide — UPI, Razorpay, client links, and when a milestone is marked paid.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd
        data={graphJsonLd(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
          faqJsonLd(allFaqs),
        )}
      />
      <SiteHeader />

      <main className="flex-1">
        <article className="mx-auto w-full max-w-5xl px-5 pt-16 pb-20">
          <p className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
            FAQ
          </p>
          <h1 className="mt-2 max-w-2xl text-[28px] leading-tight font-semibold tracking-tight sm:text-[36px]">
            Milestone payments, UPI, and the client link.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Short answers for freelancers who want to collect as they deliver —
            especially in India, where most clients already pay over UPI.
          </p>

          <div className="mt-12">
            <FaqList items={allFaqs} />
          </div>

          <div className="mt-14 flex flex-wrap items-center gap-2.5">
            <Button asChild variant="primary">
              <Link href="/signup">Start for free</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/demo">View demo</Link>
            </Button>
          </div>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
