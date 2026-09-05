import Link from "next/link";

import { ProgressBar } from "@/components/progress-bar";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectStatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/format";
import type { ProjectWithTotals } from "@/lib/data/projects";

/**
 * Grid columns shared by the header and every row, so the whole row can be a
 * single anchor instead of a table with a click handler bolted on.
 */
const columns =
  "grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_9rem_7rem_7rem_7rem_6.5rem] items-center gap-4 px-4";

export function ProjectList({ projects }: { projects: ProjectWithTotals[] }) {
  return (
    <>
      {/* Desktop: dense row list */}
      <div className="hidden overflow-hidden rounded-[10px] border border-border lg:block">
        <div
          className={`${columns} border-b border-border bg-surface py-2.5 text-[11px] font-medium text-subtle-foreground`}
        >
          <span>Project</span>
          <span>Client</span>
          <span>Progress</span>
          <span className="text-right">Total</span>
          <span className="text-right">Paid</span>
          <span className="text-right">Remaining</span>
          <span>Status</span>
        </div>

        {projects.map(({ project, totals, pendingReports }) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className={`${columns} border-b border-border py-3 text-[13px] transition-colors last:border-b-0 hover:bg-surface`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{project.name}</span>
              {pendingReports > 0 ? (
                <span className="shrink-0 text-[10px] font-medium tracking-[0.06em] text-warning">
                  REPORTED
                </span>
              ) : null}
            </span>
            <span className="truncate text-muted-foreground">{project.client_name}</span>
            <span className="flex items-center gap-2">
              <ProgressBar value={totals.deliveryProgress} className="w-16" />
              <span className="tabular text-[11px] text-subtle-foreground">
                {totals.deliveryProgress}%
              </span>
            </span>
            <span className="tabular text-right">
              {formatMoney(totals.total, project.currency)}
            </span>
            <span className="tabular text-right">
              {formatMoney(totals.paid, project.currency)}
            </span>
            <span className="tabular text-right text-muted-foreground">
              {formatMoney(totals.remaining, project.currency)}
            </span>
            <ProjectStatusBadge status={project.status} />
          </Link>
        ))}
      </div>

      {/* Tablet and mobile: stacked cards */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:hidden">
        {projects.map((item) => (
          <ProjectCard key={item.project.id} {...item} />
        ))}
      </div>
    </>
  );
}
