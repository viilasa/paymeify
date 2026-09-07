import Link from "next/link";

const links = [
  { href: "/#pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Sign up" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-subtle-foreground">
            © {new Date().getFullYear()} Paymeify
          </p>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-subtle-foreground">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="min-h-11 inline-flex items-center transition-colors hover:text-foreground sm:min-h-0"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <a
          href="https://doitlaunch.com/products/paymeify"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block w-[200px] opacity-90 transition-opacity hover:opacity-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://doitlaunch.com/badge.png"
            alt="Launched on Do It Launch"
            width={200}
            height={54}
            className="block w-[200px]"
          />
        </a>
      </div>
    </footer>
  );
}
