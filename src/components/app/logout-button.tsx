"use client";

import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={cn(
          "flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left text-[12px] text-subtle-foreground transition-colors hover:bg-elevated hover:text-foreground",
          className,
        )}
      >
        <LogOut className="size-3.5" />
        Log out
      </button>
    </form>
  );
}
