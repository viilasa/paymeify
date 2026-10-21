"use client";

import * as React from "react";

import { greeting } from "@/lib/format";

/**
 * Static pages are built once and servers run in UTC, so anything clock-based
 * is recomputed in the visitor's browser after hydration.
 */
function useLocal<T>(compute: () => T, fallback: T): T {
  const [value, setValue] = React.useState(fallback);
  React.useEffect(() => setValue(compute()), [compute]);
  return value;
}

const currentYear = () => new Date().getFullYear();
const localGreeting = () => greeting();

export function CurrentYear({ fallback }: { fallback: number }) {
  return <>{useLocal(currentYear, fallback)}</>;
}

export function Greeting() {
  return <>{useLocal(localGreeting, "Hello")}</>;
}
