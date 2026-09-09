import { revalidatePath } from "next/cache";

import { fromMinorUnits, toMinorUnits } from "@/lib/format";
import { emailPaidInvoiceReceipt } from "@/lib/invoice-mail";
import { markInvoicePaidForMilestone } from "@/lib/invoices";
import { notifyFreelancerOfPayment } from "@/lib/notify";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Milestone,
  PaymentRecordStatus,
  PaymentProvider,
  Project,
  Profile,
} from "@/lib/supabase/types";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

/** Allow 1 minor unit of float/rounding noise; reject everything else. */
const AMOUNT_TOLERANCE_MINOR = 1;

export async function settleGatewayPaid(input: {
  gateway: PaymentProvider;
  checkoutId: string;
  paymentId: string | null;
  projectId?: string;
  milestoneId?: string;
  amountMinor?: number;
  currency?: string;
}): Promise<"settled" | "skipped"> {
  const admin = createSupabaseAdminClient();
  const milestone = await findMilestone(admin, input);
  if (!milestone) {
    console.warn(`${input.gateway} webhook: no milestone for ${input.checkoutId}`);
    return "skipped";
  }

  if (milestone.payment_status === "paid") {
    return "settled";
  }

  if (input.amountMinor == null || !(input.amountMinor > 0)) {
    console.error(
      `${input.gateway} settle refused: missing provider amount for ${input.checkoutId}`,
    );
    return "skipped";
  }

  const expectedMinor = toMinorUnits(Number(milestone.amount));
  if (Math.abs(input.amountMinor - expectedMinor) > AMOUNT_TOLERANCE_MINOR) {
    console.error(
      `${input.gateway} settle refused: amount mismatch for milestone ${milestone.id}`,
      { gotMinor: input.amountMinor, expectedMinor, checkoutId: input.checkoutId },
    );
    // Record failure without granting paid. Freelancer can release checkout.
    await admin
      .from("milestones")
      .update({ payment_status: "failed" })
      .eq("id", milestone.id)
      .neq("payment_status", "paid");
    return "skipped";
  }

  const amount = fromMinorUnits(input.amountMinor);
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

  await admin
    .from("milestones")
    .update({ payment_status: "paid", status: "completed", paid_at: paidAt })
    .eq("id", milestone.id);

  await markInvoicePaidForMilestone(admin, milestone.id, paidAt);

  const { data: project } = await admin
    .from("projects")
    .select("*")
    .eq("id", milestone.project_id)
    .maybeSingle();

  if (project) {
    const { data: profile } = await admin
      .from("profiles")
      .select("name, business_name, email")
      .eq("user_id", project.user_id)
      .maybeSingle();

    const settledMilestone = {
      ...milestone,
      payment_status: "paid" as const,
      paid_at: paidAt,
      status: "completed" as const,
    };

    await notifyFreelancerOfPayment({
      toEmail: profile?.email,
      freelancerName: profile?.name ?? "there",
      projectName: project.name,
      clientName: project.client_name,
      milestoneTitle: milestone.title,
      amount,
      currency: input.currency ?? project.currency ?? "INR",
      projectId: project.id,
      kind: "settled",
      source: input.gateway,
    });

    await emailPaidInvoiceReceipt({
      db: admin,
      project: project as Project,
      milestone: settledMilestone,
      profile: (profile as Pick<Profile, "name" | "business_name"> | null) ?? {
        name: "Your freelancer",
        business_name: null,
      },
      paidAt,
    });
  }

  await refreshProjectStatus(admin, milestone.project_id);
  await revalidateProject(admin, milestone.project_id);
  return "settled";
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
