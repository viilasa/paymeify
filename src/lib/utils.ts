import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns `value` only if it is a same-origin path, else `fallback`.
 * Rejects `//host`, `/\host`, and control characters that browsers strip
 * (e.g. `/\t/evil.com` resolves to `https://evil.com`).
 */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  const base = "https://paymeify.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
