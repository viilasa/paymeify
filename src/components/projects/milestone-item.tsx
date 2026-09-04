"use client";

import {
  ArrowDown,
  ArrowUp,
  CircleDashed,
  CircleDot,
  CircleCheck,
  Link2Off,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  cancelPaymentAction,
  createPaymentAction,
  moveMilestoneAction,
  setMilestoneStatusAction,
} from "@/app/(app)/projects/actions";
import { CopyButton } from "@/components/copy-button";
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
import type { Milestone } from "@/lib/supabase/types";
import { useServerAction } from "@/lib/use-server-action";

interface MilestoneItemProps {
  milestone: Milestone;
  projectId: string;
  currency: string;
  isFirst: boolean;
  isLast: boolean;
  paymentsEnabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function MilestoneItem({
  milestone,
  projectId,
  currency,
  isFirst,
  isLast,
  paymentsEnabled,
  onEdit,
  onDelete,
}: MilestoneItemProps) {
  const { pending, run } = useServerAction();
  const ids = { project_id: projectId, milestone_id: milestone.id };

  const isPaid = milestone.payment_status === "paid";
  const hasLink = Boolean(milestone.payment_link_url);

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:gap-4">
      <span className="mt-0.5 font-mono text-[11px] text-subtle-foreground sm:w-6">
        {formatPosition(milestone.position)}
      </span>

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
        </p>

        {/* Payment controls */}
        {!isPaid ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {hasLink ? (
              <>
                <span className="text-[11px] text-muted-foreground">Payment ready</span>
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
                  Cancel link
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                disabled={pending || !paymentsEnabled}
                title={
                  paymentsEnabled
                    ? undefined
                    : "Add your Razorpay keys in Settings to create payment links."
                }
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
