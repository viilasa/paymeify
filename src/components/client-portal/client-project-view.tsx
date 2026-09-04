import { Check } from "lucide-react";

import { PaymentButton } from "@/components/client-portal/payment-button";
import { PaymentConfirming } from "@/components/client-portal/payment-confirming";
import { Logo } from "@/components/logo";
import { ProgressBar } from "@/components/progress-bar";
import { formatDate, formatMoney, formatPosition } from "@/lib/format";
import type { PublicMilestone, PublicProjectView } from "@/lib/data/public-project";
import { cn } from "@/lib/utils";

interface ClientProjectViewProps extends PublicProjectView {
  token: string;
  demo?: boolean;
  /**
   * Position of the milestone the client just came back from paying, taken
   * from Razorpay's callback URL. Used only to decide which message to show —
   * never to change payment status.
   */
  returnedFrom?: number;
}

export function ClientProjectView({
  project,
  milestones,
  totals,
  current,
  token,
  demo = false,
  returnedFrom,
}: ClientProjectViewProps) {
  const paidMilestone = returnedFrom
    ? milestones.find((m) => m.position === returnedFrom)
    : undefined;
  const awaitingConfirmation = Boolean(paidMilestone) && paidMilestone?.payment_status !== "paid";
  const everythingPaid = totals.milestoneCount > 0 && totals.remaining === 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-14">
      {/* Who this is from */}
      <p className="text-[12px] text-muted-foreground">{project.business_name}</p>
      <h1 className="mt-1.5 text-[22px] leading-tight font-medium tracking-tight sm:text-[26px]">
        {project.name}
      </h1>
      {project.description ? (
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
          {project.description}
        </p>
      ) : null}

      {paidMilestone ? (
        <div className="mt-6">
          {awaitingConfirmation ? (
            <>
              <Banner tone="pending">
                Payment received. We are confirming it with Razorpay — this page will
                update on its own in a moment.
              </Banner>
              <PaymentConfirming />
            </>
          ) : (
            <Banner tone="success">
              Payment successful. The {paidMilestone.title} milestone has been paid.
              {current ? " Your next milestone is below." : ""}
            </Banner>
          )}
        </div>
      ) : null}

      {/* Progress */}
      <section className="mt-10">
        <h2 className="text-[11px] tracking-[0.08em] text-subtle-foreground">
          PROJECT PROGRESS
        </h2>
        <p className="tabular mt-3 text-[30px] leading-none font-medium">
          {totals.deliveryProgress}%
        </p>
        <ProgressBar
          className="mt-4"
          value={totals.deliveryProgress}
          tone={totals.deliveryProgress === 100 ? "success" : "default"}
        />
        <p className="mt-2.5 text-[12px] text-muted-foreground">
          {totals.completedCount} of {totals.milestoneCount} milestones completed
        </p>
      </section>

      {/* Timeline */}
      <section className="mt-10 space-y-2.5">
        {milestones.map((milestone) => (
          <MilestoneRow
            key={milestone.position}
            milestone={milestone}
            currency={project.currency}
            isCurrent={current?.position === milestone.position}
            token={token}
            demo={demo}
          />
        ))}
      </section>

      {/* Totals */}
      <section className="mt-10 rounded-[10px] border border-border bg-card p-4 sm:p-5">
        <dl className="grid grid-cols-3 gap-4">
          <Total label="Total project" value={formatMoney(totals.total, project.currency)} />
          <Total
            label="Paid"
            value={formatMoney(totals.paid, project.currency)}
            tone={totals.paid > 0 ? "success" : undefined}
          />
          <Total
            label="Remaining"
            value={formatMoney(totals.remaining, project.currency)}
            tone="muted"
          />
        </dl>
        {everythingPaid ? (
          <p className="mt-4 border-t border-border pt-4 text-[12px] text-success">
            All milestones are paid. Thank you.
          </p>
        ) : null}
      </section>

      <footer className="mt-12 flex items-center justify-between border-t border-border pt-6">
        <span className="text-[11px] text-subtle-foreground">
          Prepared for {project.client_name}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-subtle-foreground">
          Powered by
          <Logo />
        </span>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------

function MilestoneRow({
  milestone,
  currency,
  isCurrent,
  token,
  demo,
}: {
  milestone: PublicMilestone;
  currency: string;
  isCurrent: boolean;
  token: string;
  demo: boolean;
}) {
  const isPaid = milestone.payment_status === "paid";

  return (
    <article
      className={cn(
        "rounded-[10px] border p-4",
        isCurrent ? "border-border-strong bg-card" : "border-border bg-card/40",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span
            className={cn(
              "mt-0.5 shrink-0 font-mono text-[11px]",
              isPaid ? "text-success" : "text-subtle-foreground",
            )}
          >
            {isPaid ? <Check className="size-3.5" /> : formatPosition(milestone.position)}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-medium">{milestone.title}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {statusLabel(milestone)}
            </p>
            {milestone.description ? (
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                {milestone.description}
              </p>
            ) : null}
            {milestone.due_date && !isPaid ? (
              <p className="mt-2 text-[11px] text-subtle-foreground">
                Due {formatDate(milestone.due_date)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="tabular text-[14px] font-medium">
            {formatMoney(milestone.amount, currency)}
          </p>
          {isPaid ? (
            <p className="mt-0.5 text-[10px] tracking-[0.08em] text-success">✓ PAID</p>
          ) : null}
        </div>
      </div>

      {isCurrent && !isPaid && milestone.amount > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <PaymentButton
            token={token}
            position={milestone.position}
            amount={milestone.amount}
            currency={currency}
            demo={demo}
          />
        </div>
      ) : null}
    </article>
  );
}

function statusLabel(milestone: PublicMilestone): string {
  if (milestone.payment_status === "paid") {
    return milestone.paid_at ? `Completed · paid ${formatDate(milestone.paid_at)}` : "Completed";
  }
  if (milestone.payment_status === "pending") return "Partially paid";
  if (milestone.status === "in_progress") return "In progress";
  if (milestone.status === "completed") return "Completed · awaiting payment";
  return "Pending";
}

function Total({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "muted";
}) {
  return (
    <div>
      <dt className="text-[11px] text-subtle-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular mt-1 text-[15px] font-medium",
          tone === "success" && "text-success",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "success" | "pending";
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-[8px] border px-3.5 py-2.5 text-[12px] leading-relaxed",
        tone === "success"
          ? "border-success/20 bg-success-muted text-success"
          : "border-border bg-surface text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}
