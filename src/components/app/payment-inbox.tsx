"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";

import { markMilestonePaidAction } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { formatDate, formatMoney } from "@/lib/format";
import type { PendingPaymentReport } from "@/lib/data/projects";
import { useServerAction } from "@/lib/use-server-action";

export function PaymentInbox({ reports }: { reports: PendingPaymentReport[] }) {
  if (reports.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[13px] font-medium">Payment reports</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          A client pressed “I have paid”. Check it landed in your bank, then confirm.
          A UPI scan cannot mark itself complete.
        </p>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-[10px] border border-warning/25 bg-warning/5">
        {reports.map((report) => (
          <InboxRow key={report.paymentId} report={report} />
        ))}
      </ul>
    </section>
  );
}

function InboxRow({ report }: { report: PendingPaymentReport }) {
  const { pending, run } = useServerAction();

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">
          {report.clientName}
          <span className="font-normal text-muted-foreground"> · {report.projectName}</span>
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {report.milestoneTitle}
          <span className="tabular"> · {formatMoney(report.amount, report.currency)}</span>
        </p>
        <p className="mt-1 text-[11px] text-subtle-foreground">
          Reported {formatDate(report.reportedAt)}
          {report.reference ? ` · Ref ${report.reference}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={pending}
          onClick={() =>
            run(markMilestonePaidAction, {
              project_id: report.projectId,
              milestone_id: report.milestoneId,
            })
          }
        >
          <BadgeCheck />
          Confirm received
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/projects/${report.projectId}`}>Open</Link>
        </Button>
      </div>
    </li>
  );
}
