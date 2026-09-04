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
      <span className="grid size-5 place-items-center rounded-[6px] bg-foreground text-[11px] font-semibold text-background">
        P
      </span>
      {showWordmark ? (
        <span className="text-[13px] font-medium tracking-tight text-foreground">
          Paymeify
        </span>
      ) : null}
    </span>
  );
}
