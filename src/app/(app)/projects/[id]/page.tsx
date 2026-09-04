import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { MilestoneList } from "@/components/projects/milestone-list";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectStats } from "@/components/projects/project-stats";
import { getProjectDetail, isUuid } from "@/lib/data/projects";
import { isRazorpayConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { projectPortalUrl } from "@/lib/payments";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const detail = await getProjectDetail(id);
  if (!detail) notFound();

  const { project, milestones, totals } = detail;
  const portalUrl = projectPortalUrl(project);

  return (
    <div className="space-y-8">
      <ProjectHeader project={project} portalUrl={portalUrl} />

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
      />

      <section className="rounded-[10px] border border-border bg-card p-4">
        <h2 className="text-[13px] font-medium">Client link</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Anyone with this link can view progress and pay. No account needed.
        </p>
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
