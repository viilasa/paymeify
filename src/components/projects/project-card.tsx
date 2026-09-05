import Link from "next/link";

import { ProgressBar } from "@/components/progress-bar";
import { ProjectStatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/format";
import type { ProjectWithTotals } from "@/lib/data/projects";

/** Mobile representation of a project row. */
export function ProjectCard({ project, totals, pendingReports }: ProjectWithTotals) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-[10px] border border-border bg-card p-4 transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium">{project.name}</span>
            {pendingReports > 0 ? (
              <span className="shrink-0 text-[10px] font-medium tracking-[0.06em] text-warning">
                REPORTED
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {project.client_name}
          </p>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <ProgressBar value={totals.deliveryProgress} className="flex-1" />
        <span className="tabular text-[11px] text-subtle-foreground">
          {totals.deliveryProgress}%
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-[12px]">
        <div>
          <dt className="text-subtle-foreground">Total</dt>
          <dd className="tabular mt-0.5 text-foreground">
            {formatMoney(totals.total, project.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-subtle-foreground">Paid</dt>
          <dd className="tabular mt-0.5 text-foreground">
            {formatMoney(totals.paid, project.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-subtle-foreground">Remaining</dt>
          <dd className="tabular mt-0.5 text-muted-foreground">
            {formatMoney(totals.remaining, project.currency)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
