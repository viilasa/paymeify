"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { LogoutButton } from "@/components/app/logout-button";
import { isActive, navItems } from "@/components/app/nav-items";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Mobile-only header. The sidebar takes over from the `md` breakpoint up. */
export function TopBar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/dashboard" aria-label="Paymeify dashboard">
          <Logo />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {open ? (
        <div className="border-t border-border px-2.5 pt-2 pb-3">
          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[13px] transition-colors",
                  isActive(pathname, item.href)
                    ? "bg-elevated text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-border pt-3">
            <div className="px-2.5 pb-2">
              <p className="truncate text-[12px] font-medium">{name}</p>
              <p className="truncate text-[11px] text-subtle-foreground">{email}</p>
            </div>
            <LogoutButton className="px-2.5" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
