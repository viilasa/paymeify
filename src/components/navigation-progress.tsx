"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top bar while App Router soft-navigations are in flight.
 * Makes the first click feel acknowledged when RSC work is slow.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setActive(false);
  }, [pathname, searchParams]);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (/^(https?:|\/\/)/i.test(href)) {
        try {
          const url = new URL(href, window.location.href);
          if (url.origin !== window.location.origin) return;
        } catch {
          return;
        }
      }

      const next = new URL(href, window.location.href);
      const current = new URL(window.location.href);
      if (next.pathname === current.pathname && next.search === current.search) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      // Avoid flash on instant navigations.
      timerRef.current = setTimeout(() => setActive(true), 80);
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5 overflow-hidden bg-transparent"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="nav-progress h-full w-1/3 bg-foreground" />
    </div>
  );
}
