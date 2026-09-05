import Link from "next/link";

const links = [
  { href: "/faq", label: "FAQ" },
  { href: "/demo", label: "Demo" },
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Sign up" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 py-6 text-[12px] text-subtle-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Paymeify</span>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
