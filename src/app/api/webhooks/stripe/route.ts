import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { loadCredentialsForProject } from "@/lib/payments/connections";
import {
  claimWebhookEvent,
  releaseWebhookEvent,
  settleGatewayClosed,
  settleGatewayPaid,
} from "@/lib/payments/webhook-settle";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const unverified = safeJson(rawBody) as {
    type?: string;
    id?: string;
    data?: { object?: Record<string, unknown> };
  } | null;

  const object = unverified?.data?.object ?? {};
  const metadata = (object.metadata ?? {}) as { project_id?: string; milestone_id?: string };
  const checkoutId = typeof object.id === "string" ? object.id : "";
  const projectId = await resolveProjectId(checkoutId, metadata.project_id);

  if (!projectId) {
    console.warn("stripe webhook: could not resolve project");
    return NextResponse.json({ received: true });
  }

  const owner = await loadCredentialsForProject(projectId, "stripe");
  if (!owner) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = new Stripe(owner.credentials.secret).webhooks.constructEvent(
      rawBody,
      signature,
      owner.credentials.webhookSecret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventId = event.id;

  try {
    const claim = await claimWebhookEvent(eventId, "stripe", event.type);
    if (claim === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (error) {
    console.error("stripe webhook: could not record event", error);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.payment_status === "paid" || session.status === "complete") {
        await settleGatewayPaid({
          gateway: "stripe",
          checkoutId: session.id,
          paymentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? null),
          projectId: session.metadata?.project_id ?? projectId,
          milestoneId: session.metadata?.milestone_id,
          amountMinor: session.amount_total ?? undefined,
          currency: session.currency?.toUpperCase(),
        });
      }
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      await settleGatewayClosed({
        gateway: "stripe",
        checkoutId: session.id,
        status: "expired",
        milestoneId: session.metadata?.milestone_id,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    await releaseWebhookEvent(eventId);
    console.error(`stripe webhook: ${event.type} failed`, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function resolveProjectId(
  checkoutId: string,
  notedProjectId: string | undefined,
): Promise<string | null> {
  if (notedProjectId) return notedProjectId;
  if (!checkoutId) return null;

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
