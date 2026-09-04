import { cn } from "@/lib/utils";

interface ProgressBarProps {
  /** 0–100. */
  value: number;
  className?: string;
  tone?: "default" | "success";
}

export function ProgressBar({ value, className, tone = "default" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1 w-full overflow-hidden rounded-full bg-[#1e1e1e]", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "success" ? "bg-success/80" : "bg-foreground",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
