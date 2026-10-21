import type { Metadata } from "next";
import Link from "next/link";

import { DashboardRefresh } from "@/components/app/dashboard-refresh";
import { PaymentInbox } from "@/components/app/payment-inbox";
import { EmptyState } from "@/components/empty-state";
import { Greeting } from "@/components/local-time";
import { ProjectList } from "@/components/projects/project-list";
import { SummaryStats } from "@/components/projects/summary-stats";
import { Button } from "@/components/ui/button";
import { displayName, requireSession } from "@/lib/auth";
import {
  listPendingPaymentReports,
  listProjects,
  summarise,
  type CurrencyTotal,
} from "@/lib/data/projects";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/** One figure per currency, e.g. "₹50,000 + $2,000". */
function joinTotals(currencies: CurrencyTotal[], key: "outstanding" | "collected"): string {
  if (currencies.length === 0) return formatMoney(0, "INR");
  const nonZero = currencies.filter((c) => c[key] > 0);
  const shown = nonZero.length ? nonZero : currencies.slice(0, 1);
  return shown.map((c) => formatMoney(c[key], c.currency)).join(" + ");
}

export default async function DashboardPage() {
  const [{ profile }, projects, reports] = await Promise.all([
    requireSession(),
    listProjects(),
    listPendingPaymentReports(),
  ]);
  const summary = summarise(projects);
  const recent = projects.filter((p) => p.project.status !== "archived").slice(0, 8);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[18px] font-medium tracking-tight">
            <Greeting />, {displayName(profile)}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Here is where your projects and payments stand.
          </p>
        </div>
        <Button asChild variant="primary" className="h-11 w-full sm:h-8 sm:w-auto">
          <Link href="/projects/new">+ New Project</Link>
        </Button>
      </div>

      <DashboardRefresh />

      <PaymentInbox reports={reports} />

      <SummaryStats
        stats={[
          { label: "Active projects", value: String(summary.activeProjects) },
          {
            label: "Total outstanding",
            value: joinTotals(summary.currencies, "outstanding"),
          },
          {
            label: "Collected",
            value: joinTotals(summary.currencies, "collected"),
            tone: summary.currencies.some((c) => c.collected > 0) ? "success" : "default",
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
