import { Check } from "lucide-react";

import { PaymentButton } from "@/components/client-portal/payment-button";
import { PaymentConfirming } from "@/components/client-portal/payment-confirming";
import { UpiPayment } from "@/components/client-portal/upi-payment";
import { Logo } from "@/components/logo";
import { ProgressBar } from "@/components/progress-bar";
import { formatDate, formatMoney, formatPosition } from "@/lib/format";
import type { PublicMilestone, PublicProjectView } from "@/lib/data/public-project";
import { buildUpiUri, supportsUpi } from "@/lib/upi";
import { upiQrSvg } from "@/lib/upi-qr";
import { cn } from "@/lib/utils";

/** Everything the client needs to pay one milestone by UPI. */
interface UpiOffer {
  upiId: string;
  uri: string;
  qrSvg: string;
}

interface ClientProjectViewProps extends PublicProjectView {
  token: string;
  demo?: boolean;
  /** Owner has a connected gateway that can mark this milestone paid on its own. */
  autoPay?: boolean;
  /**
   * Position of the milestone the client just came back from paying, taken
   * from Razorpay's callback URL. Used only to decide which message to show —
   * never to change payment status.
   */
  returnedFrom?: number;
}

export async function ClientProjectView({
  project,
  milestones,
  totals,
  current,
  token,
  demo = false,
  autoPay = false,
  returnedFrom,
}: ClientProjectViewProps) {
  const paidMilestone = returnedFrom
    ? milestones.find((m) => m.position === returnedFrom)
    : undefined;
  const awaitingConfirmation = Boolean(paidMilestone) && paidMilestone?.payment_status !== "paid";
  const everythingPaid = totals.milestoneCount > 0 && totals.remaining === 0;

  const payable = current && current.amount > 0 ? current : undefined;
  const upi = payable ? await buildUpiOffer(project, payable) : null;
  const canPay = Boolean(upi) || autoPay;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-14">
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
                Payment received. We are confirming it — this page will update on its
                own in a moment.
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
            upi={current?.position === milestone.position ? upi : null}
            autoPay={autoPay}
          />
        ))}
      </section>

      {/* Totals */}
      <section className="mt-10 rounded-[10px] border border-border bg-card p-4 sm:p-5">
        <dl className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-3">
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
        {!everythingPaid && payable && !canPay ? (
          <p className="mt-4 border-t border-border pt-4 text-[12px] leading-relaxed text-muted-foreground">
            {project.business_name} has not set up online payments yet. Get in touch with
            them to arrange this payment.
          </p>
        ) : null}
      </section>

      <footer className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
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

/**
 * Prepares the QR and deep link for one milestone. Returns null when UPI is not
 * on offer, either because the freelancer has not added an ID or because the
 * project is not priced in rupees.
 */
async function buildUpiOffer(
  project: PublicProjectView["project"],
  milestone: PublicMilestone,
): Promise<UpiOffer | null> {
  const upiId = project.upi_id;
  if (!upiId || !supportsUpi(project.currency)) return null;

  const uri = buildUpiUri({
    vpa: upiId,
    payeeName: project.business_name,
    amount: milestone.amount,
    note: `${project.name} ${milestone.title}`,
  });

  return { upiId, uri, qrSvg: await upiQrSvg(uri) };
}

// ---------------------------------------------------------------------------

function MilestoneRow({
  milestone,
  currency,
  isCurrent,
  token,
  demo,
  upi,
  autoPay,
}: {
  milestone: PublicMilestone;
  currency: string;
  isCurrent: boolean;
  token: string;
  demo: boolean;
  upi: UpiOffer | null;
  autoPay: boolean;
}) {
  const isPaid = milestone.payment_status === "paid";
  const showPayment = isCurrent && !isPaid && milestone.amount > 0;

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

      {showPayment && autoPay ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-3 text-[12px] text-muted-foreground">
            Pay here and this milestone marks itself paid.
          </p>
          <PaymentButton
            token={token}
            position={milestone.position}
            amount={milestone.amount}
            currency={currency}
            demo={demo}
          />
        </div>
      ) : null}

      {showPayment && upi ? (
        <div className={autoPay ? "mt-4" : "mt-4 border-t border-border pt-4"}>
          {autoPay ? (
            <p className="mb-3 text-[12px] text-muted-foreground">
              Or scan with any UPI app. They will confirm it on their side.
            </p>
          ) : null}
          <UpiPayment
            token={token}
            position={milestone.position}
            amount={milestone.amount}
            currency={currency}
            upiId={upi.upiId}
            upiUri={upi.uri}
            qrSvg={upi.qrSvg}
            reported={milestone.payment_reported}
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
  if (milestone.payment_reported) return "Payment reported · awaiting confirmation";
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
