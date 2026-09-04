import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fromMinorUnits } from "@/lib/format";
import { isValidWebhookSignature } from "@/lib/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Milestone, PaymentRecordStatus } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Payload shapes — only the fields this handler relies on.
// ---------------------------------------------------------------------------

const paymentLinkEntity = z.object({
  id: z.string(),
  amount: z.number().optional(),
  amount_paid: z.number().optional(),
  currency: z.string().optional(),
  notes: z
    .object({
      project_id: z.string().optional(),
      milestone_id: z.string().optional(),
    })
    .partial()
    .optional(),
});

const webhookBody = z.object({
  event: z.string(),
  payload: z.object({
    payment_link: z.object({ entity: paymentLinkEntity }).optional(),
    payment: z
      .object({
        entity: z.object({
          id: z.string(),
          amount: z.number().optional(),
          currency: z.string().optional(),
        }),
      })
      .optional(),
  }),
});

type PaymentLink = z.infer<typeof paymentLinkEntity>;
type Admin = ReturnType<typeof createSupabaseAdminClient>;

const HANDLED_EVENTS = new Set([
  "payment_link.paid",
  "payment_link.partially_paid",
  "payment_link.expired",
  "payment_link.cancelled",
]);

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !isValidWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const parsed = webhookBody.safeParse(safeJson(rawBody));
  if (!parsed.success) {
    // Malformed but authentic: acknowledge so Razorpay stops retrying.
    console.warn("razorpay webhook: unrecognised payload shape");
    return NextResponse.json({ received: true });
  }

  const { event, payload } = parsed.data;
  if (!HANDLED_EVENTS.has(event) || !payload.payment_link) {
    return NextResponse.json({ received: true, ignored: event });
  }

  const admin = createSupabaseAdminClient();

  // Claim the event id so a retry of the same delivery is a no-op.
  const eventId =
    request.headers.get("x-razorpay-event-id") ??
    `${event}:${payload.payment_link.entity.id}`;

  const { error: claimError } = await admin
    .from("webhook_events")
    .insert({ id: eventId, gateway: "razorpay", event });

  if (claimError) {
    if (claimError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("razorpay webhook: could not record event", claimError);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  try {
    const link = payload.payment_link.entity;

    switch (event) {
      case "payment_link.paid":
        await handlePaid(admin, link, payload.payment?.entity.id ?? null);
        break;
      case "payment_link.partially_paid":
        await handlePartiallyPaid(admin, link, payload.payment?.entity.id ?? null);
        break;
      case "payment_link.expired":
        await handleClosed(admin, link, "expired");
        break;
      case "payment_link.cancelled":
        await handleClosed(admin, link, "cancelled");
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Release the claim so Razorpay's retry can try again.
    await admin.from("webhook_events").delete().eq("id", eventId);
    console.error(`razorpay webhook: ${event} failed`, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handlePaid(admin: Admin, link: PaymentLink, paymentId: string | null) {
  const milestone = await findMilestone(admin, link);
  if (!milestone) {
    console.warn(`razorpay webhook: no milestone for payment link ${link.id}`);
    return;
  }

  const amount = fromMinorUnits(link.amount_paid ?? link.amount ?? 0) || Number(milestone.amount);
  const paidAt = new Date().toISOString();

  await recordPayment(admin, {
    milestone,
    paymentLinkId: link.id,
    paymentId,
    amount,
    currency: link.currency ?? "INR",
    status: "captured",
    paidAt,
  });

  if (milestone.payment_status !== "paid") {
    await admin
      .from("milestones")
      .update({ payment_status: "paid", status: "completed", paid_at: paidAt })
      .eq("id", milestone.id);
  }

  await refreshProjectStatus(admin, milestone.project_id);
  await revalidateProject(admin, milestone.project_id);
}

async function handlePartiallyPaid(
  admin: Admin,
  link: PaymentLink,
  paymentId: string | null,
) {
  const milestone = await findMilestone(admin, link);
  if (!milestone) return;

  await recordPayment(admin, {
    milestone,
    paymentLinkId: link.id,
    paymentId,
    amount: fromMinorUnits(link.amount_paid ?? 0),
    currency: link.currency ?? "INR",
    status: "pending",
    paidAt: null,
  });

  if (milestone.payment_status === "unpaid") {
    await admin
      .from("milestones")
      .update({ payment_status: "pending" })
      .eq("id", milestone.id);
  }

  await revalidateProject(admin, milestone.project_id);
}

/**
 * An expired or cancelled link is not a failure the client should see. Clear it
 * so the freelancer can issue a fresh one.
 */
async function handleClosed(
  admin: Admin,
  link: PaymentLink,
  status: Extract<PaymentRecordStatus, "expired" | "cancelled">,
) {
  const milestone = await findMilestone(admin, link);

  await admin
    .from("payments")
    .update({ status })
    .eq("gateway_payment_link_id", link.id)
    .in("status", ["created", "pending"]);

  if (!milestone || milestone.payment_status === "paid") return;

  await admin
    .from("milestones")
    .update({ payment_link_id: null, payment_link_url: null, payment_status: "unpaid" })
    .eq("id", milestone.id);

  await revalidateProject(admin, milestone.project_id);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolves the milestone by stored link id first, then by the link's notes. */
async function findMilestone(admin: Admin, link: PaymentLink): Promise<Milestone | null> {
  const { data: byLink } = await admin
    .from("milestones")
    .select("*")
    .eq("payment_link_id", link.id)
    .maybeSingle();

  if (byLink) return byLink;

  const milestoneId = link.notes?.milestone_id;
  if (!milestoneId) return null;

  const { data: byNote } = await admin
    .from("milestones")
    .select("*")
    .eq("id", milestoneId)
    .maybeSingle();

  return byNote ?? null;
}

interface RecordPaymentInput {
  milestone: Milestone;
  paymentLinkId: string;
  paymentId: string | null;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  paidAt: string | null;
}

/**
 * Writes exactly one payment row per Razorpay payment. Reuses the placeholder
 * row created alongside the link when there is one.
 */
async function recordPayment(admin: Admin, input: RecordPaymentInput) {
  if (input.paymentId) {
    const { data: existing } = await admin
      .from("payments")
      .select("id")
      .eq("gateway", "razorpay")
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
    .eq("gateway_payment_link_id", input.paymentLinkId)
    .is("gateway_payment_id", null)
    .maybeSingle();

  const values = {
    project_id: input.milestone.project_id,
    milestone_id: input.milestone.id,
    amount: input.amount,
    currency: input.currency,
    gateway: "razorpay",
    gateway_payment_id: input.paymentId,
    gateway_payment_link_id: input.paymentLinkId,
    status: input.status,
    paid_at: input.paidAt,
  };

  if (placeholder) {
    await admin.from("payments").update(values).eq("id", placeholder.id);
    return;
  }

  const { error } = await admin.from("payments").insert(values);

  // A concurrent delivery won the race; the row exists, which is all we need.
  if (error && error.code !== "23505") throw new Error(error.message);
}

/** Marks a project completed once every milestone is paid. */
async function refreshProjectStatus(admin: Admin, projectId: string) {
  const { data: milestones } = await admin
    .from("milestones")
    .select("payment_status")
    .eq("project_id", projectId);

  if (!milestones?.length) return;

  const allPaid = milestones.every((m) => m.payment_status === "paid");
  if (!allPaid) return;

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

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  if (project?.public_token) revalidatePath(`/p/${project.public_token}`);
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
