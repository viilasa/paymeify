import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center px-4 pt-[env(safe-area-inset-top)] sm:px-5">
        <Link href="/" aria-label="Paymeify home" className="inline-flex min-h-11 items-center">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-12 sm:items-center sm:px-5 sm:pt-0 sm:pb-24">
        <div className="w-full max-w-[360px]">{children}</div>
      </main>
      <p className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-[12px] text-subtle-foreground">
        <Link href="/terms" className="min-h-11 inline-flex items-center hover:text-foreground">
          Terms
        </Link>
        <span className="px-2">·</span>
        <Link href="/privacy" className="min-h-11 inline-flex items-center hover:text-foreground">
          Privacy
        </Link>
      </p>
    </div>
  );
}
