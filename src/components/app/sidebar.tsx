"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/app/logout-button";
import { isActive, navItems } from "@/components/app/nav-items";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

interface SidebarProps {
  name: string;
  email: string;
}

export function Sidebar({ name, email }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-52 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" aria-label="Paymeify dashboard">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 px-2.5">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] transition-colors",
                active
                  ? "bg-elevated text-foreground"
                  : "text-muted-foreground hover:bg-elevated/60 hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2.5">
        <div className="px-2 pt-1 pb-2">
          <p className="truncate text-[12px] font-medium text-foreground">{name}</p>
          <p className="truncate text-[11px] text-subtle-foreground">{email}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
