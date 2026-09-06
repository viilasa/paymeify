import Image from "next/image";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/brand/logo.svg"
        alt={showWordmark ? "" : "Paymeify"}
        width={24}
        height={24}
        className="size-6 rounded-[6px]"
        unoptimized
      />
      {showWordmark ? (
        <span className="text-[13px] font-medium tracking-tight text-foreground">
          Paymeify
        </span>
      ) : null}
    </span>
  );
}
