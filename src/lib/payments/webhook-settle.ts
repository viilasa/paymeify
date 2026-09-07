import { revalidatePath } from "next/cache";

import { fromMinorUnits } from "@/lib/format";
import { markInvoicePaidForMilestone } from "@/lib/invoices";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Milestone, PaymentRecordStatus, PaymentProvider } from "@/lib/supabase/types";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

export async function settleGatewayPaid(input: {
  gateway: PaymentProvider;
  checkoutId: string;
  paymentId: string | null;
  projectId?: string;
  milestoneId?: string;
  amountMinor?: number;
  currency?: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const milestone = await findMilestone(admin, input);
  if (!milestone) {
    console.warn(`${input.gateway} webhook: no milestone for ${input.checkoutId}`);
    return;
  }

  const amount =
    fromMinorUnits(input.amountMinor ?? 0) || Number(milestone.amount);
  const paidAt = new Date().toISOString();

  await recordPayment(admin, {
    gateway: input.gateway,
    milestone,
    checkoutId: input.checkoutId,
    paymentId: input.paymentId,
    amount,
    currency: input.currency ?? "INR",
    status: "captured",
    paidAt,
  });

  if (milestone.payment_status !== "paid") {
    await admin
      .from("milestones")
      .update({ payment_status: "paid", status: "completed", paid_at: paidAt })
      .eq("id", milestone.id);
  }

  await markInvoicePaidForMilestone(admin, milestone.id, paidAt);
  await refreshProjectStatus(admin, milestone.project_id);
  await revalidateProject(admin, milestone.project_id);
}

export async function settleGatewayClosed(input: {
  gateway: PaymentProvider;
  checkoutId: string;
  status: Extract<PaymentRecordStatus, "expired" | "cancelled">
  projectId?: string;
  milestoneId?: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const milestone = await findMilestone(admin, input);

  await admin
    .from("payments")
    .update({ status: input.status })
    .eq("gateway_payment_link_id", input.checkoutId)
    .in("status", ["created", "pending"]);

  if (!milestone || milestone.payment_status === "paid") return;

  await admin
    .from("milestones")
    .update({ payment_link_id: null, payment_link_url: null, payment_status: "unpaid" })
    .eq("id", milestone.id);

  await revalidateProject(admin, milestone.project_id);
}

export async function claimWebhookEvent(
  id: string,
  gateway: PaymentProvider,
  event: string,
): Promise<"new" | "duplicate"> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("webhook_events").insert({ id, gateway, event });
  if (error) {
    if (error.code === "23505") return "duplicate";
    throw new Error(error.message);
  }
  return "new";
}

export async function releaseWebhookEvent(id: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("webhook_events").delete().eq("id", id);
}

async function findMilestone(
  admin: Admin,
  input: { checkoutId: string; milestoneId?: string },
): Promise<Milestone | null> {
  const { data: byLink } = await admin
    .from("milestones")
    .select("*")
    .eq("payment_link_id", input.checkoutId)
    .maybeSingle();

  if (byLink) return byLink;
  if (!input.milestoneId) return null;

  const { data: byNote } = await admin
    .from("milestones")
    .select("*")
    .eq("id", input.milestoneId)
    .maybeSingle();

  return byNote ?? null;
}

async function recordPayment(
  admin: Admin,
  input: {
    gateway: PaymentProvider;
    milestone: Milestone;
    checkoutId: string;
    paymentId: string | null;
    amount: number;
    currency: string;
    status: PaymentRecordStatus;
    paidAt: string | null;
  },
) {
  if (input.paymentId) {
    const { data: existing } = await admin
      .from("payments")
      .select("id")
      .eq("gateway", input.gateway)
      .eq("gateway_payment_id", input.paymentId)
      .maybeSingle();

    if (existing) {
      await admin
        .from("payments")
        .update({ status: input.status, paid_at: input.paidAt })
        .eq("id", existing.id);
      return;
    }
  }

  const { data: placeholder } = await admin
    .from("payments")
    .select("id")
    .eq("gateway_payment_link_id", input.checkoutId)
    .is("gateway_payment_id", null)
    .maybeSingle();

  const values = {
    project_id: input.milestone.project_id,
    milestone_id: input.milestone.id,
    amount: input.amount,
    currency: input.currency,
    gateway: input.gateway,
    gateway_payment_id: input.paymentId,
    gateway_payment_link_id: input.checkoutId,
    status: input.status,
    paid_at: input.paidAt,
  };

  if (placeholder) {
    await admin.from("payments").update(values).eq("id", placeholder.id);
    return;
  }

  const { error } = await admin.from("payments").insert(values);
  if (error && error.code !== "23505") throw new Error(error.message);
}

async function refreshProjectStatus(admin: Admin, projectId: string) {
  const { data: milestones } = await admin
    .from("milestones")
    .select("payment_status")
    .eq("project_id", projectId);

  if (!milestones?.length) return;
  if (!milestones.every((m) => m.payment_status === "paid")) return;

  await admin
    .from("projects")
    .update({ status: "completed" })
    .eq("id", projectId)
    .eq("status", "active");
}

async function revalidateProject(admin: Admin, projectId: string) {
  const { data: project } = await admin
    .from("projects")
    .select("public_token")
    .eq("id", projectId)
    .maybeSingle();

  revalidatePath("/dashboard", "layout");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  if (project?.public_token) {
    revalidatePath(`/p/${project.public_token}`);
    revalidatePath(`/p/${project.public_token}`, "layout");
  }
}
