"use client";

import * as React from "react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <Logo />
      <h1 className="mt-6 text-[16px] font-medium">Something went wrong</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        We hit an unexpected error. Try again — if it keeps happening, refresh the page.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[11px] text-subtle-foreground">
          Reference {error.digest}
        </p>
      ) : null}
      <Button variant="primary" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
