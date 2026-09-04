import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center px-5">
        <Link href="/" aria-label="Paymeify home">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pt-10 pb-16 sm:items-center sm:pt-0 sm:pb-24">
        <div className="w-full max-w-[360px]">{children}</div>
      </main>
    </div>
  );
}
