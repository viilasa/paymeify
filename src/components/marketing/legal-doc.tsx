import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-5 sm:py-16">
          <p className="text-[12px] text-subtle-foreground">Legal</p>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight sm:text-[32px]">
            {title}
          </h1>
          <p className="mt-3 text-[13px] text-muted-foreground">Last updated {updated}</p>
          <div className="legal-prose mt-8 space-y-6 text-[15px] leading-[1.65] text-muted-foreground [&_h2]:pt-2 [&_h2]:text-[16px] [&_h2]:font-medium [&_h2]:text-foreground [&_p]:text-pretty [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
