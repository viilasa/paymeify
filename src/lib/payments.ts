import { AppError } from "@/lib/action-result";
import { appUrl } from "@/lib/env";
import { cancelPaymentLink, createPaymentLink } from "@/lib/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Milestone, Project } from "@/lib/supabase/types";

export interface PaymentLinkResult {
  url: string;
  id: string;
  /** True when an existing link was reused rather than a new one created. */
  reused: boolean;
}

/**
 * Returns a payable Razorpay link for a milestone, creating one only if the
 * milestone does not already have a live link.
 *
 * Runs with the service role: milestone payment columns are gateway-owned and
 * blocked for the `authenticated` role at the database level. Callers are
 * responsible for authorising the request before calling this.
 */
export async function ensureMilestonePaymentLink(
  projectId: string,
  milestoneId: string,
): Promise<PaymentLinkResult> {
  const admin = createSupabaseAdminClient();

  const { data: milestone, error } = await admin
    .from("milestones")
    .select("*")
    .eq("id", milestoneId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw new AppError("Could not load that milestone.");
  if (!milestone) throw new AppError("That milestone no longer exists.");

  if (milestone.payment_status === "paid") {
    throw new AppError("This milestone has already been paid.");
  }

  if (milestone.payment_link_id && milestone.payment_link_url) {
    return { url: milestone.payment_link_url, id: milestone.payment_link_id, reused: true };
  }

  if (!(Number(milestone.amount) > 0)) {
    throw new AppError("Set an amount above zero before creating a payment.");
  }

  const { data: project } = await admin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) throw new AppError("That project no longer exists.");

  const created = await createPaymentLink({
    amount: Number(milestone.amount),
    currency: project.currency,
    description: `${project.name} — ${milestone.title}`,
    projectId: project.id,
    milestoneId: milestone.id,
    customerName: project.client_name,
    customerEmail: project.client_email,
    // The position tells the portal which milestone to confirm on return.
    // Razorpay's own callback params are ignored — the webhook is the source
    // of truth for payment status.
    callbackUrl: `${appUrl()}/p/${project.public_token}?paid=${milestone.position}`,
  });

  // Claim the milestone only if no other request got there first.
  const { data: claimed } = await admin
    .from("milestones")
    .update({ payment_link_id: created.id, payment_link_url: created.shortUrl })
    .eq("id", milestone.id)
    .is("payment_link_id", null)
    .select("payment_link_id, payment_link_url")
    .maybeSingle();

  if (!claimed) {
    // Someone else won the race. Discard ours and use theirs.
    await cancelPaymentLink(created.id);
    const { data: current } = await admin
      .from("milestones")
      .select("payment_link_id, payment_link_url")
      .eq("id", milestone.id)
      .single();

    if (!current?.payment_link_id || !current.payment_link_url) {
      throw new AppError("Could not create a payment link. Try again.");
    }
    return { url: current.payment_link_url, id: current.payment_link_id, reused: true };
  }

  await admin.from("payments").insert({
    project_id: project.id,
    milestone_id: milestone.id,
    amount: Number(milestone.amount),
    currency: project.currency,
    gateway: "razorpay",
    gateway_payment_link_id: created.id,
    status: "created",
  });

  return { url: created.shortUrl, id: created.id, reused: false };
}

/** Clears a milestone's link so a fresh one can be issued. */
export async function releaseMilestonePaymentLink(milestoneId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data: milestone } = await admin
    .from("milestones")
    .select("payment_link_id, payment_status")
    .eq("id", milestoneId)
    .maybeSingle();

  if (!milestone?.payment_link_id) return;
  if (milestone.payment_status === "paid") {
    throw new AppError("This milestone has already been paid.");
  }

  await cancelPaymentLink(milestone.payment_link_id);

  await admin
    .from("milestones")
    .update({ payment_link_id: null, payment_link_url: null, payment_status: "unpaid" })
    .eq("id", milestoneId);

  await admin
    .from("payments")
    .update({ status: "cancelled" })
    .eq("gateway_payment_link_id", milestone.payment_link_id)
    .eq("status", "created");
}

/**
 * Marks a milestone paid because the freelancer confirmed the money arrived.
 *
 * This is the settlement path for UPI and anything else that lands outside a
 * gateway — a bank transfer, or cash. There is no webhook to trust for those,
 * so the freelancer checking their own account *is* the verification step.
 *
 * Runs with the service role because milestone payment columns are blocked for
 * the `authenticated` role at the database level. Callers must authorise the
 * request before calling this.
 */
export async function settleMilestoneManually(
  projectId: string,
  milestoneId: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { data: milestone, error } = await supabase
    .from("milestones")
    .select("*")
    .eq("id", milestoneId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw new AppError("Could not load that milestone.");
  if (!milestone) throw new AppError("That milestone no longer exists.");
  if (milestone.payment_status === "paid") {
    throw new AppError("This milestone is already marked paid.");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("currency")
    .eq("id", projectId)
    .maybeSingle();

  const paidAt = new Date().toISOString();

  // Promote the client's own report if there is one, so the ledger keeps the
  // reference number they gave us instead of growing a second row.
  const { data: claimed } = await supabase
    .from("payments")
    .update({ status: "captured", paid_at: paidAt })
    .eq("milestone_id", milestone.id)
    .eq("gateway", "upi")
    .eq("status", "pending")
    .select("id");

  if (!claimed?.length) {
    await supabase.from("payments").insert({
      project_id: projectId,
      milestone_id: milestone.id,
      amount: Number(milestone.amount),
      currency: project?.currency ?? "INR",
      gateway: "manual",
      status: "captured",
      paid_at: paidAt,
    });
  }

  const { error: updateError } = await supabase
    .from("milestones")
    .update({ payment_status: "paid", paid_at: paidAt, status: "completed" })
    .eq("id", milestone.id);

  // The guard trigger rejects this for anything Razorpay has a claim on, and
  // surfaces its own reason.
  if (updateError) {
    throw new AppError(updateError.message || "Could not mark the milestone paid.");
  }
}

/**
 * Undoes a manual settlement, for when the freelancer confirmed too early.
 *
 * Only touches off-gateway payment rows: a Razorpay payment is the gateway's
 * fact to state, not something to reverse from here. Delivery `status` is left
 * alone because the work being finished is independent of the money arriving.
 */
export async function reopenMilestone(
  projectId: string,
  milestoneId: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { data: milestone } = await supabase
    .from("milestones")
    .select("id, payment_status")
    .eq("id", milestoneId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!milestone) throw new AppError("That milestone no longer exists.");

  const { data: gatewayPayments } = await supabase
    .from("payments")
    .select("id")
    .eq("milestone_id", milestone.id)
    .eq("gateway", "razorpay")
    .eq("status", "captured")
    .limit(1);

  if (gatewayPayments?.length) {
    throw new AppError(
      "This milestone was paid through Razorpay, so it cannot be reopened here.",
    );
  }

  await supabase
    .from("payments")
    .update({ status: "cancelled" })
    .eq("milestone_id", milestone.id)
    .in("gateway", ["upi", "manual"])
    .in("status", ["pending", "captured"]);

  const { error } = await supabase
    .from("milestones")
    .update({ payment_status: "unpaid", paid_at: null })
    .eq("id", milestone.id);

  if (error) throw new AppError(error.message || "Could not reopen the milestone.");
}

/**
 * The milestone a client is allowed to pay: the lowest-positioned unpaid one.
 * Paying out of order is rejected so the portal and the ledger stay in step.
 */
export function assertPayableMilestone(
  milestones: Pick<Milestone, "position" | "payment_status">[],
  position: number,
): void {
  const sorted = [...milestones].sort((a, b) => a.position - b.position);
  const next = sorted.find((m) => m.payment_status !== "paid");

  if (!next) throw new AppError("Every milestone on this project is already paid.");
  if (next.position !== position) {
    throw new AppError("Milestones are paid in order. This one is not due yet.");
  }
}

export function projectPortalUrl(project: Pick<Project, "public_token">): string {
  return `${appUrl()}/p/${project.public_token}`;
}
