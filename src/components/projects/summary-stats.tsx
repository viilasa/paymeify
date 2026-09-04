import { cn } from "@/lib/utils";

export interface Stat {
  label: string;
  value: string;
  tone?: "default" | "success" | "muted";
}

const toneClass = {
  default: "text-foreground",
  success: "text-success",
  muted: "text-muted-foreground",
} as const;

/** Plain numbers in a row — deliberately not cards. */
export function SummaryStats({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid gap-x-10 gap-y-5 sm:flex sm:flex-wrap sm:gap-x-12",
        stats.length > 2 ? "grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt className="text-[11px] text-subtle-foreground">{stat.label}</dt>
          <dd
            className={cn(
              "tabular mt-1 text-[18px] leading-none font-medium",
              toneClass[stat.tone ?? "default"],
            )}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
