import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ProjectList } from "@/components/projects/project-list";
import { SummaryStats } from "@/components/projects/summary-stats";
import { Button } from "@/components/ui/button";
import { displayName, requireSession } from "@/lib/auth";
import { listProjects, summarise } from "@/lib/data/projects";
import { formatMoney, greeting } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [{ profile }, projects] = await Promise.all([requireSession(), listProjects()]);
  const summary = summarise(projects);
  const recent = projects.filter((p) => p.project.status !== "archived").slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[18px] font-medium tracking-tight">
            {greeting()}, {displayName(profile)}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Here is where your projects and payments stand.
          </p>
        </div>
        <Button asChild variant="primary">
          <Link href="/projects/new">+ New Project</Link>
        </Button>
      </div>

      <SummaryStats
        stats={[
          { label: "Active projects", value: String(summary.activeProjects) },
          {
            label: "Total outstanding",
            value: formatMoney(summary.outstanding, summary.currency),
          },
          {
            label: "Collected",
            value: formatMoney(summary.collected, summary.currency),
            tone: summary.collected > 0 ? "success" : "default",
          },
        ]}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium">Projects</h2>
          {projects.length > recent.length ? (
            <Link
              href="/projects"
              className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
            </Link>
          ) : null}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            title="No projects yet."
            description="Create a project, add milestones, and share one link with your client."
            action={
              <Button asChild variant="primary">
                <Link href="/projects/new">Create your first project</Link>
              </Button>
            }
          />
        ) : (
          <ProjectList projects={recent} />
        )}
      </section>
    </div>
  );
}
