import Link from "next/link";

const links = [
  { href: "/demo", label: "Demo" },
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Sign up" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-5">
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
    </footer>
  );
}
