import type {
  MilestoneStatus,
  PaymentStatus,
  ProjectStatus,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap";

function Dot({ className }: { className: string }) {
  return <span className={cn("size-1.5 shrink-0 rounded-full", className)} />;
}

const projectStatusMeta: Record<ProjectStatus, { label: string; dot: string; text: string }> = {
  draft: { label: "Draft", dot: "bg-subtle-foreground", text: "text-subtle-foreground" },
  active: { label: "Active", dot: "bg-foreground", text: "text-muted-foreground" },
  completed: { label: "Completed", dot: "bg-success", text: "text-success" },
  archived: { label: "Archived", dot: "bg-[#3a3a3a]", text: "text-subtle-foreground" },
};

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const meta = projectStatusMeta[status];
  return (
    <span className={cn(base, meta.text, className)}>
      <Dot className={meta.dot} />
      {meta.label}
    </span>
  );
}

const milestoneStatusMeta: Record<MilestoneStatus, { label: string; dot: string; text: string }> = {
  pending: { label: "Pending", dot: "bg-[#3a3a3a]", text: "text-subtle-foreground" },
  in_progress: { label: "In progress", dot: "bg-warning", text: "text-muted-foreground" },
  completed: { label: "Completed", dot: "bg-success", text: "text-muted-foreground" },
};

export function MilestoneStatusBadge({
  status,
  className,
}: {
  status: MilestoneStatus;
  className?: string;
}) {
  const meta = milestoneStatusMeta[status];
  return (
    <span className={cn(base, meta.text, className)}>
      <Dot className={meta.dot} />
      {meta.label}
    </span>
  );
}

const paymentStatusMeta: Record<PaymentStatus, { label: string; className: string }> = {
  unpaid: { label: "UNPAID", className: "text-subtle-foreground" },
  pending: { label: "AWAITING", className: "text-warning" },
  paid: { label: "PAID", className: "text-success" },
  failed: { label: "FAILED", className: "text-danger" },
};

/** Compact uppercase payment marker. Deliberately not a filled badge. */
export function PaymentStatusTag({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  const meta = paymentStatusMeta[status];
  return (
    <span
      className={cn(
        "text-[10px] font-medium tracking-[0.08em] whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      {status === "paid" ? `✓ ${meta.label}` : meta.label}
    </span>
  );
}
