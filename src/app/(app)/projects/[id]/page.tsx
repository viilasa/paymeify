import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { MilestoneList } from "@/components/projects/milestone-list";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectStats } from "@/components/projects/project-stats";
import { requireSession } from "@/lib/auth";
import { getProjectDetail, isUuid } from "@/lib/data/projects";
import { isRazorpayConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { projectPortalUrl } from "@/lib/payments";
import { supportsUpi } from "@/lib/upi";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [detail, { profile }] = await Promise.all([getProjectDetail(id), requireSession()]);
  if (!detail) notFound();

  const { project, milestones, totals, payments } = detail;
  const portalUrl = projectPortalUrl(project);

  // UPI transfers the client has told us about but nobody has confirmed yet.
  const reportedMilestoneIds = payments
    .filter((p) => p.gateway === "upi" && p.status === "pending" && p.milestone_id)
    .map((p) => p.milestone_id as string);

  // UPI covers rupee projects; anything else needs Razorpay.
  const canCollect =
    (Boolean(profile.upi_id) && supportsUpi(project.currency)) || isRazorpayConfigured();

  return (
    <div className="space-y-8">
      <ProjectHeader project={project} portalUrl={portalUrl} />

      {reportedMilestoneIds.length > 0 ? (
        <p className="rounded-[8px] border border-warning/25 bg-warning/5 px-3.5 py-2.5 text-[12px] leading-relaxed">
          Your client reported a payment. Confirm it on the milestone below once it
          shows in your bank — a UPI scan cannot mark itself paid.
        </p>
      ) : null}

      {project.description ? (
        <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          {project.description}
        </p>
      ) : null}

      <ProjectStats totals={totals} currency={project.currency} />

      <MilestoneList
        projectId={project.id}
        currency={project.currency}
        milestones={milestones}
        paymentsEnabled={isRazorpayConfigured()}
        reportedMilestoneIds={reportedMilestoneIds}
      />

      <section className="rounded-[10px] border border-border bg-card p-4">
        <h2 className="text-[13px] font-medium">Client link</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Anyone with this link can view progress and pay. No account needed.
        </p>
        {!canCollect ? (
          <p className="mt-3 rounded-[8px] border border-warning/25 bg-warning/5 px-3 py-2 text-[12px] leading-relaxed text-foreground">
            Your client can see this project but cannot pay yet.{" "}
            <Link href="/settings" className="underline underline-offset-2">
              Add your UPI ID
            </Link>{" "}
            and they will get a QR to scan.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code className="min-w-0 flex-1 truncate rounded-[8px] border border-border bg-surface px-3 py-2 font-mono text-[12px] text-muted-foreground">
            {portalUrl}
          </code>
          <Link
            href={`/p/${project.public_token}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Open
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </section>

      <dl className="flex flex-wrap gap-x-10 gap-y-3 text-[12px]">
        <div>
          <dt className="text-subtle-foreground">Client email</dt>
          <dd className="mt-0.5 text-muted-foreground">{project.client_email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-subtle-foreground">Start date</dt>
          <dd className="mt-0.5 text-muted-foreground">{formatDate(project.start_date)}</dd>
        </div>
        <div>
          <dt className="text-subtle-foreground">Due date</dt>
          <dd className="mt-0.5 text-muted-foreground">{formatDate(project.due_date)}</dd>
        </div>
        <div>
          <dt className="text-subtle-foreground">Currency</dt>
          <dd className="mt-0.5 text-muted-foreground">{project.currency}</dd>
        </div>
      </dl>
    </div>
  );
}
