import type { Milestone } from "@/lib/supabase/types";

type OrderInput = Pick<Milestone, "id" | "title" | "position" | "payment_status" | "payment_link_id">;

/**
 * Why a new milestone order isn't allowed, or null if it's fine. Shared by the
 * drag-and-drop list (instant feedback) and the server (the real check).
 *
 * - Paid milestones stay ahead of unpaid ones: clients pay in order.
 * - A milestone with an open checkout keeps its number, because the gateway
 *   sends the client back to the portal with that number in the URL.
 */
export function milestoneOrderProblem(
  milestones: OrderInput[],
  orderedIds: string[],
): string | null {
  const byId = new Map(milestones.map((m) => [m.id, m]));
  if (
    orderedIds.length !== milestones.length ||
    new Set(orderedIds).size !== orderedIds.length ||
    orderedIds.some((id) => !byId.has(id))
  ) {
    return "The milestone list changed. Refresh and try again.";
  }

  let seenUnpaid = false;
  for (const [index, id] of orderedIds.entries()) {
    const milestone = byId.get(id)!;
    const paid = milestone.payment_status === "paid";
    if (paid && seenUnpaid) return "Paid milestones stay ahead of unpaid ones.";
    if (!paid) seenUnpaid = true;

    if (milestone.payment_link_id && !paid && milestone.position !== index + 1) {
      return `“${milestone.title}” has an open checkout, so it stays at number ${milestone.position}. Release the checkout to move it.`;
    }
  }

  return null;
}

/** Ids sorted by their current position. */
export function currentOrder(milestones: Pick<Milestone, "id" | "position">[]): string[] {
  return [...milestones].sort((a, b) => a.position - b.position).map((m) => m.id);
}
