import { ProgressBar } from "@/components/progress-bar";
import { SummaryStats } from "@/components/projects/summary-stats";
import { formatMoney } from "@/lib/format";
import type { ProjectTotals } from "@/lib/progress";

export function ProjectStats({
  totals,
  currency,
}: {
  totals: ProjectTotals;
  currency: string;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-4 sm:p-5">
      <SummaryStats
        stats={[
          { label: "Total", value: formatMoney(totals.total, currency) },
          {
            label: "Paid",
            value: formatMoney(totals.paid, currency),
            tone: totals.paid > 0 ? "success" : "default",
          },
          {
            label: "Remaining",
            value: formatMoney(totals.remaining, currency),
            tone: "muted",
          },
        ]}
      />

      <div className="mt-5 space-y-2">
        <ProgressBar
          value={totals.financialProgress}
          tone={totals.financialProgress === 100 ? "success" : "default"}
        />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          <span className="tabular">
            {formatMoney(totals.paid, currency)} of{" "}
            {formatMoney(totals.total, currency)} paid
          </span>
          <span className="tabular text-subtle-foreground">
            {totals.completedCount} of {totals.milestoneCount} milestones completed ·{" "}
            {totals.deliveryProgress}%
          </span>
        </div>
      </div>
    </div>
  );
}
