import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { MilestoneList } from "@/components/projects/milestone-list";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectStats } from "@/components/projects/project-stats";
import { requireSession } from "@/lib/auth";
import { getProjectDetail, isUuid } from "@/lib/data/projects";
import { formatDate } from "@/lib/format";
import { listInvoicesForProject } from "@/lib/invoices";
import { projectPortalUrl } from "@/lib/payments";
import { ownerHasAutoPay } from "@/lib/payments/connections";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supportsUpi } from "@/lib/upi";
import type { Invoice } from "@/lib/supabase/types";

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
  const supabase = await createSupabaseServerClient();
  const invoices = await listInvoicesForProject(supabase, project.id);
  const invoicesByMilestoneId: Record<string, Invoice> = {};
  for (const invoice of invoices) {
    const existing = invoicesByMilestoneId[invoice.milestone_id];
    if (!existing || invoice.issued_at > existing.issued_at) {
      invoicesByMilestoneId[invoice.milestone_id] = invoice;
    }
  }

  // UPI transfers the client has told us about but nobody has confirmed yet.
  const reportedMilestoneIds = payments
    .filter((p) => p.gateway === "upi" && p.status === "pending" && p.milestone_id)
    .map((p) => p.milestone_id as string);

  const autoPay = await ownerHasAutoPay(profile.user_id, project.currency);
  const canCollect =
    (Boolean(profile.upi_id) && supportsUpi(project.currency)) || autoPay;
  const hasUnpaidInvoiceable = milestones.some(
    (m) => m.payment_status !== "paid" && Number(m.amount) > 0,
  );

  return (
    <div className="space-y-8">
      <ProjectHeader
        project={project}
        hasUnpaidInvoiceable={hasUnpaidInvoiceable}
      />

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
        paymentsEnabled={autoPay}
        reportedMilestoneIds={reportedMilestoneIds}
        invoicesByMilestoneId={invoicesByMilestoneId}
        canEmailInvoice={Boolean(project.client_email)}
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
              {supportsUpi(project.currency)
                ? "Add a UPI ID or connect Razorpay"
                : "Connect Stripe"}
            </Link>{" "}
            in Settings.
          </p>
        ) : null}
        <div className="mt-3 flex min-w-0 items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-[8px] border border-border bg-surface px-3 py-2 font-mono text-[12px] text-muted-foreground">
            {portalUrl}
          </code>
          <CopyButton
            value={portalUrl}
            label="Copy client link"
            toastMessage="Client link copied"
            iconOnly
            variant="secondary"
          />
          <Link
            href={`/p/${project.public_token}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
            aria-label="Open client link"
          >
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
          <dt className="text-subtle-foreground">Client phone</dt>
          <dd className="mt-0.5 text-muted-foreground">{project.client_phone ?? "—"}</dd>
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
