import { NextResponse, type NextRequest } from "next/server";

import { loadCredentialsForProject } from "@/lib/payments/connections";
import { archiveDodoProducts, dodoClient } from "@/lib/payments/providers";
import {
  claimWebhookEvent,
  releaseWebhookEvent,
  settleGatewayClosed,
  settleGatewayPaid,
} from "@/lib/payments/webhook-settle";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DodoPaymentEvent = {
  type?: string;
  data?: {
    payment_id?: string;
    checkout_session_id?: string | null;
    total_amount?: number;
    currency?: string;
    metadata?: { project_id?: string; milestone_id?: string };
    product_cart?: { product_id?: string }[] | null;
  };
};

/**
 * Dodo signs with Standard Webhooks (webhook-id / -timestamp / -signature).
 * Each freelancer has their own secret, so the project is resolved from the
 * unverified body first and nothing is trusted until the signature checks out.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };
  if (!headers["webhook-id"] || !headers["webhook-signature"]) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const unverified = safeJson(rawBody) as DodoPaymentEvent | null;
  if (!unverified || typeof unverified !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let projectId: string | null;
  let owner: Awaited<ReturnType<typeof loadCredentialsForProject>>;
  try {
    projectId = await resolveProjectId(
      unverified.data?.checkout_session_id ?? null,
      unverified.data?.metadata?.project_id,
    );
    owner = projectId ? await loadCredentialsForProject(projectId, "dodo") : null;
  } catch (error) {
    console.error("dodo webhook: lookup failed", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!projectId || !owner) {
    // Not a Paymeify checkout, or the owner disconnected Dodo: retrying can't help.
    return NextResponse.json({ received: true });
  }

  let event: DodoPaymentEvent;
  try {
    event = dodoClient(owner.credentials).webhooks.unwrap(rawBody, {
      headers,
      key: owner.credentials.webhookSecret,
    }) as DodoPaymentEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventId = headers["webhook-id"];
  const type = event.type ?? "unknown";

  try {
    const claim = await claimWebhookEvent(eventId, "dodo", type);
    if (claim === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (error) {
    console.error("dodo webhook: could not record event", error);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }

  try {
    const payment = event.data ?? {};
    const checkoutId = payment.checkout_session_id ?? "";

    if (type === "payment.succeeded") {
      await settleGatewayPaid({
        gateway: "dodo",
        checkoutId,
        paymentId: payment.payment_id ?? null,
        projectId,
        milestoneId: payment.metadata?.milestone_id,
        amountMinor: payment.total_amount,
        currency: payment.currency?.toUpperCase(),
      });
      // Each checkout sold a one-off product; retire it so it can't sell again.
      const productIds = (payment.product_cart ?? [])
        .map((item) => item.product_id)
        .filter((id): id is string => Boolean(id));
      if (productIds.length) await archiveDodoProducts(owner.credentials, productIds);
    } else if (type === "payment.cancelled" && checkoutId) {
      await settleGatewayClosed({
        gateway: "dodo",
        checkoutId,
        status: "cancelled",
        projectId,
        milestoneId: payment.metadata?.milestone_id,
      });
    }
    // payment.failed / processing: the client can retry on the same checkout.

    return NextResponse.json({ received: true });
  } catch (error) {
    await releaseWebhookEvent(eventId);
    console.error(`dodo webhook: ${type} failed`, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function resolveProjectId(
  checkoutId: string | null,
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
