import { NextResponse, type NextRequest } from "next/server";

import { isCronAuthorized } from "@/lib/notify";
import { loadOwnerCredentials } from "@/lib/payments/connections";
import {
  fetchCheckoutStatus,
  providerForCurrency,
} from "@/lib/payments/providers";
import {
  settleGatewayClosed,
  settleGatewayPaid,
} from "@/lib/payments/webhook-settle";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Only touch checkouts that have been open at least this long (missed webhooks). */
const MIN_AGE_MS = 5 * 60 * 1000;
/** Cap work per run so a backlog cannot time out the function. */
const MAX_PER_RUN = 40;

/**
 * Asks Razorpay/Stripe what happened for unpaid milestones that still have an
 * open checkout. Settles paid ones, clears expired/cancelled ones.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - MIN_AGE_MS).toISOString();

  const { data: milestones, error } = await admin
    .from("milestones")
    .select("id, project_id, payment_link_id, payment_status, updated_at, amount")
    .neq("payment_status", "paid")
    .not("payment_link_id", "is", null)
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: true })
    .limit(MAX_PER_RUN);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let settled = 0;
  let closed = 0;
  let open = 0;
  let skipped = 0;
  let failed = 0;

  for (const milestone of milestones ?? []) {
    const checkoutId = milestone.payment_link_id;
    if (!checkoutId) {
      skipped += 1;
      continue;
    }

    try {
      const { data: project } = await admin
        .from("projects")
        .select("user_id, currency")
        .eq("id", milestone.project_id)
        .maybeSingle();

      if (!project) {
        skipped += 1;
        continue;
      }

      const provider = providerForCurrency(project.currency);
      const credentials = await loadOwnerCredentials(project.user_id, provider);
      if (!credentials) {
        skipped += 1;
        continue;
      }

      const status = await fetchCheckoutStatus(provider, credentials, checkoutId);

      if (status.state === "paid") {
        const result = await settleGatewayPaid({
          gateway: provider,
          checkoutId,
          paymentId: status.paymentId,
          projectId: milestone.project_id,
          milestoneId: milestone.id,
          amountMinor: status.amountMinor,
          currency: status.currency ?? project.currency,
        });
        if (result === "settled") settled += 1;
        else skipped += 1;
        continue;
      }

      if (status.state === "closed") {
        await settleGatewayClosed({
          gateway: provider,
          checkoutId,
          status: status.reason,
          milestoneId: milestone.id,
          projectId: milestone.project_id,
        });
        closed += 1;
        continue;
      }

      if (status.state === "open") {
        open += 1;
        continue;
      }

      skipped += 1;
    } catch (err) {
      failed += 1;
      console.error("payment-reconcile: milestone failed", milestone.id, err);
    }
  }

  return NextResponse.json({
    checked: milestones?.length ?? 0,
    settled,
    closed,
    open,
    skipped,
    failed,
  });
}
