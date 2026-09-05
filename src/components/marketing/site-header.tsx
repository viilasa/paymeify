import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/faq", label: "FAQ" },
  { href: "/demo", label: "Demo" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5">
        <Link href="/" aria-label="Paymeify home">
          <Logo />
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1.5">
          {nav.map((item) => (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="/signup">Start for free</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
