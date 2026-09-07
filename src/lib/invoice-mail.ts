import {
  ensureInvoiceForMilestone,
  markInvoicePaidForMilestone,
  markInvoiceSent,
} from "@/lib/invoices";
import { notifyClient } from "@/lib/notify";
import { resendApiKey } from "@/lib/env";
import type { Milestone, Profile, Project } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Db = SupabaseClient<Database>;

/**
 * After payment is confirmed, mark/create the invoice as paid and email it.
 * Kept outside payments.ts / notify.ts to avoid circular imports.
 */
export async function emailPaidInvoiceReceipt(input: {
  db: Db;
  project: Project;
  milestone: Milestone;
  profile: Pick<Profile, "name" | "business_name">;
  paidAt?: string;
}): Promise<{ emailed: boolean; number?: string; error?: string }> {
  const paidAt = input.paidAt ?? new Date().toISOString();
  const milestone: Milestone = {
    ...input.milestone,
    payment_status: "paid",
    paid_at: paidAt,
    status: "completed",
  };

  try {
    await markInvoicePaidForMilestone(input.db, milestone.id, paidAt);
    const invoice = await ensureInvoiceForMilestone({
      db: input.db,
      project: input.project,
      milestone,
      profile: input.profile,
    });

    if (!input.project.client_email?.trim()) {
      return {
        emailed: false,
        number: invoice.number,
        error: "Add a client email to email the paid invoice.",
      };
    }
    if (!resendApiKey()) {
      return {
        emailed: false,
        number: invoice.number,
        error: "RESEND_API_KEY is not set on this deployment.",
      };
    }

    const sent = await notifyClient({
      db: input.db,
      project: input.project,
      profile: input.profile,
      kind: "invoice_sent",
      milestone,
      invoice: { ...invoice, status: "paid" },
      receipt: true,
      skipSms: true,
    });

    if (sent.email) {
      await markInvoiceSent(input.db, invoice.id);
      return { emailed: true, number: invoice.number };
    }
    return {
      emailed: false,
      number: invoice.number,
      error: sent.error ?? "Could not email the paid invoice.",
    };
  } catch (error) {
    console.error("Paid invoice email failed", error);
    return { emailed: false, error: "Could not email the paid invoice." };
  }
}
