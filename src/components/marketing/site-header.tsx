import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-5">
        <Link href="/" aria-label="Paymeify home" className="inline-flex min-h-11 shrink-0 items-center">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm" className="min-h-11 px-3 sm:min-h-7 sm:px-2.5">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild variant="primary" size="sm" className="min-h-11 px-3 sm:min-h-7 sm:px-2.5">
            <Link href="/signup">
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Start for free</span>
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
