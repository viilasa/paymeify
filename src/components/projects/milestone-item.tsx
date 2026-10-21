"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Bell,
  CircleDashed,
  CircleDot,
  CircleCheck,
  GripVertical,
  Link2Off,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import {
  cancelPaymentAction,
  createPaymentAction,
  markMilestonePaidAction,
  markMilestoneUnpaidAction,
  moveMilestoneAction,
  remindClientAction,
  setMilestoneStatusAction,
} from "@/app/(app)/projects/actions";
import { CopyButton } from "@/components/copy-button";
import { SendInvoiceButton } from "@/components/projects/send-invoice-button";
import { MilestoneStatusBadge, PaymentStatusTag } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatMoney, formatPosition } from "@/lib/format";
import type { Invoice, Milestone } from "@/lib/supabase/types";
import { useServerAction } from "@/lib/use-server-action";
import { cn } from "@/lib/utils";

interface MilestoneItemProps {
  milestone: Milestone;
  /** Number shown in the list; follows a drag before the server confirms it. */
  displayPosition: number;
  projectId: string;
  currency: string;
  isFirst: boolean;
  isLast: boolean;
  paymentsEnabled: boolean;
  /** The client says they sent a UPI transfer for this one. */
  paymentReported: boolean;
  invoice?: Invoice | null;
  canEmailInvoice?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function MilestoneItem({
  milestone,
  displayPosition,
  projectId,
  currency,
  isFirst,
  isLast,
  paymentsEnabled,
  paymentReported,
  invoice,
  canEmailInvoice,
  onEdit,
  onDelete,
}: MilestoneItemProps) {
  const { pending, run } = useServerAction();
  const ids = { project_id: projectId, milestone_id: milestone.id };

  const isPaid = milestone.payment_status === "paid";
  const hasLink = Boolean(milestone.payment_link_url);
  const canInvoice = !isPaid && Number(milestone.amount) > 0;

  // Same rules as milestoneOrderProblem: these keep their place.
  const lockReason = isPaid
    ? "Paid milestones keep their number"
    : milestone.payment_link_id
      ? "Release the open checkout to move this milestone"
      : null;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: milestone.id,
    // Locked rows can't be picked up, but others can still be dropped around them.
    disabled: { draggable: Boolean(lockReason), droppable: false },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex flex-col gap-3 bg-card px-4 py-4 first:rounded-t-[10px] last:rounded-b-[10px] sm:flex-row sm:items-start sm:gap-4",
        isDragging && "relative z-10 rounded-[10px] shadow-lg shadow-black/40 ring-1 ring-border-strong",
      )}
    >
      <div className="flex items-center gap-1 sm:-ml-2 sm:w-10 sm:items-start">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={
            lockReason
              ? `${milestone.title}: ${lockReason}`
              : `Reorder ${milestone.title}, number ${displayPosition}`
          }
          title={lockReason ?? "Drag to reorder"}
          className={cn(
            "-my-1 flex size-7 shrink-0 touch-none items-center justify-center rounded-[6px] text-subtle-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            lockReason
              ? "cursor-not-allowed opacity-30"
              : "cursor-grab hover:bg-surface hover:text-foreground active:cursor-grabbing",
          )}
        >
          <GripVertical className="size-3.5" />
        </button>
        <span className="font-mono text-[11px] text-subtle-foreground sm:mt-0.5">
          {formatPosition(displayPosition)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-[13px] font-medium">{milestone.title}</p>
          <MilestoneStatusBadge status={milestone.status} />
        </div>

        {milestone.description ? (
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
            {milestone.description}
          </p>
        ) : null}

        <p className="mt-1.5 text-[11px] text-subtle-foreground">
          Due {formatDate(milestone.due_date)}
          {milestone.paid_at ? ` · Paid ${formatDate(milestone.paid_at)}` : ""}
          {invoice
            ? ` · ${invoice.number}${invoice.status === "paid" ? " · Paid" : " · Sent"}`
            : ""}
        </p>

        {canInvoice ? (
          <div className="mt-3">
            <SendInvoiceButton
              projectId={projectId}
              milestoneId={milestone.id}
              disabled={!canEmailInvoice}
              size="sm"
              label={invoice ? `Resend ${invoice.number}` : "Send invoice"}
            />
          </div>
        ) : null}

        {/* The client has reported a transfer and is waiting on confirmation. */}
        {!isPaid && paymentReported ? (
          <div className="mt-3 rounded-[8px] border border-warning/25 bg-warning/5 p-3">
            <p className="text-[12px] text-foreground">
              Your client says they sent this payment.
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Check it reached your account, then confirm. Nothing is marked paid until
              you do.
            </p>
            <Button
              size="sm"
              variant="primary"
              className="mt-2.5"
              disabled={pending}
              onClick={() => run(markMilestonePaidAction, ids)}
            >
              <BadgeCheck />
              Confirm payment received
            </Button>
          </div>
        ) : null}

        {/*
          Razorpay controls only. UPI needs nothing per milestone — the client
          portal builds the QR from the amount already on record.
        */}
        {!isPaid && (hasLink || paymentsEnabled) ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasLink ? (
              <>
                <span className="text-[11px] text-muted-foreground">
                  Checkout open — release it if the client paid but this is still unpaid
                </span>
                <CopyButton
                  size="sm"
                  value={milestone.payment_link_url ?? ""}
                  label="Copy Payment Link"
                  toastMessage="Payment link copied"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(cancelPaymentAction, ids)}
                >
                  <Link2Off />
                  Release checkout
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => run(createPaymentAction, ids)}
              >
                Create Payment
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-1.5">
        <span className="tabular text-[13px] font-medium">
          {formatMoney(Number(milestone.amount), currency)}
        </span>
        <div className="flex items-center gap-1.5">
          <PaymentStatusTag status={milestone.payment_status} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Actions for ${milestone.title}`}
                disabled={pending}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                Edit milestone
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Payment</DropdownMenuLabel>
              {isPaid ? (
                <DropdownMenuItem
                  onSelect={() => run(markMilestoneUnpaidAction, ids)}
                >
                  <RotateCcw />
                  Mark as unpaid
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onSelect={() => run(markMilestonePaidAction, ids)}>
                    <BadgeCheck />
                    Mark as paid
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      run(remindClientAction, { project_id: projectId, milestone_id: milestone.id })
                    }
                  >
                    <Bell />
                    Remind client to pay
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Set status</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() =>
                  run(setMilestoneStatusAction, { ...ids, status: "pending" })
                }
              >
                <CircleDashed />
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  run(setMilestoneStatusAction, { ...ids, status: "in_progress" })
                }
              >
                <CircleDot />
                In progress
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  run(setMilestoneStatusAction, { ...ids, status: "completed" })
                }
              >
                <CircleCheck />
                Completed
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isFirst}
                onSelect={() => run(moveMilestoneAction, { ...ids, direction: "up" })}
              >
                <ArrowUp />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isLast}
                onSelect={() => run(moveMilestoneAction, { ...ids, direction: "down" })}
              >
                <ArrowDown />
                Move down
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem destructive disabled={isPaid} onSelect={onDelete}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}
