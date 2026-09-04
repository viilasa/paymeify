import type { MilestoneStatus, PaymentStatus } from "@/lib/supabase/types";

export interface ProgressInput {
  amount: number;
  status: MilestoneStatus;
  payment_status: PaymentStatus;
}

export interface ProjectTotals {
  /** Sum of every milestone amount. */
  total: number;
  /** Sum of milestones with payment_status = paid. */
  paid: number;
  /** total − paid, floored at zero. */
  remaining: number;
  milestoneCount: number;
  completedCount: number;
  /** completed milestones / total milestones, 0–100. */
  deliveryProgress: number;
  /** paid amount / total amount, 0–100. */
  financialProgress: number;
}

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / whole) * 100)));
}

export function computeTotals(milestones: ProgressInput[]): ProjectTotals {
  let total = 0;
  let paid = 0;
  let completedCount = 0;

  for (const milestone of milestones) {
    const amount = Number(milestone.amount) || 0;
    total += amount;
    if (milestone.payment_status === "paid") paid += amount;
    if (milestone.status === "completed") completedCount += 1;
  }

  return {
    total,
    paid,
    remaining: Math.max(0, total - paid),
    milestoneCount: milestones.length,
    completedCount,
    deliveryProgress: percent(completedCount, milestones.length),
    financialProgress: percent(paid, total),
  };
}

/**
 * The milestone the client is expected to pay next: the lowest-positioned one
 * that has not been paid. Everything after it is "upcoming".
 */
export function findCurrentMilestone<T extends { position: number; payment_status: PaymentStatus }>(
  milestones: T[],
): T | undefined {
  return [...milestones]
    .sort((a, b) => a.position - b.position)
    .find((m) => m.payment_status !== "paid");
}
