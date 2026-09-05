import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Page not found",
  robots: noIndexRobots,
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <Logo />
      <h1 className="mt-6 text-[16px] font-medium">Page not found</h1>
      <p className="mt-2 text-[13px] text-muted-foreground">
        The page you were looking for does not exist.
      </p>
      <Button asChild variant="secondary" className="mt-6">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
