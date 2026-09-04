import Link from "next/link";

import { Logo } from "@/components/logo";

export default function ProjectLinkNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <Logo />
      <h1 className="mt-6 text-[16px] font-medium">This project link is not available</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        The link may have been replaced with a new one, or the project may have been
        removed. Ask whoever sent it to you for an up-to-date link.
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
