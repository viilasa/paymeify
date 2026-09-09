import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { loadCredentialsForProject } from "@/lib/payments/connections";
import { verifyWebhookSignature } from "@/lib/payments/providers";
import {
  claimWebhookEvent,
  releaseWebhookEvent,
  settleGatewayClosed,
  settleGatewayPaid,
} from "@/lib/payments/webhook-settle";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const HANDLED = new Set([
  "payment_link.paid",
  "payment_link.expired",
  "payment_link.cancelled",
]);

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const parsed = webhookBody.safeParse(safeJson(rawBody));
  if (!parsed.success || !parsed.data.payload.payment_link) {
    return NextResponse.json({ received: true });
  }

  const link = parsed.data.payload.payment_link.entity;
  const projectId = await resolveProjectId(link.id, link.notes?.project_id);
  if (!projectId) {
    console.warn("razorpay webhook: could not resolve project for", link.id);
    return NextResponse.json({ received: true });
  }

  const owner = await loadCredentialsForProject(projectId, "razorpay");
  if (!owner || !verifyWebhookSignature("razorpay", owner.credentials.webhookSecret, rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { event, payload } = parsed.data;
  if (!HANDLED.has(event)) {
    return NextResponse.json({ received: true, ignored: event });
  }

  const headerEventId = request.headers.get("x-razorpay-event-id")?.trim();
  const paymentEntityId = payload.payment?.entity.id;
  // Prefer Razorpay's durable event id. Fall back only when we have a payment id
  // so two different paid payloads cannot share the same claim key.
  const eventId =
    headerEventId ||
    (paymentEntityId ? `${event}:${link.id}:${paymentEntityId}` : null) ||
    (event !== "payment_link.paid" ? `${event}:${link.id}` : null);

  if (!eventId) {
    console.error("razorpay webhook: missing x-razorpay-event-id for paid event", link.id);
    return NextResponse.json(
      { error: "Missing event id" },
      { status: 400 },
    );
  }

  try {
    const claim = await claimWebhookEvent(eventId, "razorpay", event);
    if (claim === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (error) {
    console.error("razorpay webhook: could not record event", error);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  try {
    if (event === "payment_link.paid") {
      const amountMinor =
        payload.payment?.entity.amount ?? link.amount_paid ?? link.amount;
      await settleGatewayPaid({
        gateway: "razorpay",
        checkoutId: link.id,
        paymentId: paymentEntityId ?? null,
        projectId,
        milestoneId: link.notes?.milestone_id,
        amountMinor,
        currency: payload.payment?.entity.currency ?? link.currency,
      });
    } else if (event === "payment_link.expired") {
      await settleGatewayClosed({
        gateway: "razorpay",
        checkoutId: link.id,
        status: "expired",
        milestoneId: link.notes?.milestone_id,
      });
    } else if (event === "payment_link.cancelled") {
      await settleGatewayClosed({
        gateway: "razorpay",
        checkoutId: link.id,
        status: "cancelled",
        milestoneId: link.notes?.milestone_id,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    await releaseWebhookEvent(eventId);
    console.error(`razorpay webhook: ${event} failed`, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function resolveProjectId(
  checkoutId: string,
  notedProjectId: string | undefined,
): Promise<string | null> {
  if (notedProjectId) return notedProjectId;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("milestones")
    .select("project_id")
    .eq("payment_link_id", checkoutId)
    .maybeSingle();

  return data?.project_id ?? null;
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
