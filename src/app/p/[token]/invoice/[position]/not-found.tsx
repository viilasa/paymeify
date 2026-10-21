import Link from "next/link";

import { Logo } from "@/components/logo";

export default function InvoiceNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <Logo />
      <h1 className="mt-6 text-[16px] font-medium">This invoice is not available</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        It may not have been issued yet, or the project link was replaced. Open your
        project link, or ask whoever sent it for an up-to-date invoice.
      </p>
      <Link
        href="/"
        className="mt-6 text-[12px] text-subtle-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        About Paymeify
      </Link>
    </div>
  );
}
