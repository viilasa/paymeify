import type { SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/action-result";
import { appUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Database,
  Invoice,
  Milestone,
  Profile,
  Project,
} from "@/lib/supabase/types";

type Db = SupabaseClient<Database>;

function senderName(profile: Pick<Profile, "name" | "business_name">): string {
  return profile.business_name?.trim() || profile.name.trim() || "Your freelancer";
}

function formatInvoiceNumber(seq: number): string {
  return `INV-${String(seq).padStart(4, "0")}`;
}

async function nextInvoiceNumber(db: Db, userId: string): Promise<string> {
  const { data, error } = await db
    .from("invoices")
    .select("number")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new AppError("Could not allocate an invoice number.");

  let max = 0;
  for (const row of data ?? []) {
    const match = /^INV-(\d+)$/i.exec(row.number.trim());
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }

  return formatInvoiceNumber(max + 1);
}

/** Create or reuse the open invoice for a milestone. Amounts are snapshotted. */
export async function ensureInvoiceForMilestone(input: {
  db: Db;
  project: Project;
  milestone: Milestone;
  profile: Pick<Profile, "name" | "business_name">;
}): Promise<Invoice> {
  const { db, project, milestone, profile } = input;

  const { data: existing } = await db
    .from("invoices")
    .select("*")
    .eq("milestone_id", milestone.id)
    .eq("status", "sent")
    .maybeSingle();

  if (existing) return existing;

  if (milestone.payment_status === "paid") {
    const { data: paid } = await db
      .from("invoices")
      .select("*")
      .eq("milestone_id", milestone.id)
      .eq("status", "paid")
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (paid) return paid;
  }

  const now = new Date().toISOString();

  // Numbers are per freelancer, so two invoices created at once can pick the
  // same one; the unique index rejects the loser and it tries the next number.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const number = await nextInvoiceNumber(db, project.user_id);
    const { data, error } = await db
      .from("invoices")
      .insert({
        user_id: project.user_id,
        project_id: project.id,
        milestone_id: milestone.id,
        number,
        from_name: senderName(profile),
        client_name: project.client_name,
        client_email: project.client_email,
        line_title: milestone.title,
        amount: Number(milestone.amount),
        currency: project.currency,
        due_date: milestone.due_date,
        status: milestone.payment_status === "paid" ? "paid" : "sent",
        issued_at: now,
        paid_at: milestone.payment_status === "paid" ? milestone.paid_at ?? now : null,
      })
      .select("*")
      .single();

    if (data && !error) return data;
    if (error?.code !== "23505") {
      console.error("invoice insert failed", error?.message);
      throw new AppError("Could not create the invoice.");
    }

    // Either this milestone already got an open invoice, or the number was taken.
    const { data: raced } = await db
      .from("invoices")
      .select("*")
      .eq("milestone_id", milestone.id)
      .eq("status", "sent")
      .maybeSingle();
    if (raced) return raced;
  }

  throw new AppError("Could not allocate an invoice number. Try again.");
}

export async function markInvoiceSent(db: Db, invoiceId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db
    .from("invoices")
    .update({ sent_at: now, updated_at: now })
    .eq("id", invoiceId);
  if (error) console.error("Could not mark invoice sent", error.message);
}

export async function markInvoicePaidForMilestone(
  db: Db,
  milestoneId: string,
  paidAt = new Date().toISOString(),
): Promise<void> {
  const { error } = await db
    .from("invoices")
    .update({ status: "paid", paid_at: paidAt, updated_at: paidAt })
    .eq("milestone_id", milestoneId)
    .eq("status", "sent");
  if (error) console.error("Could not mark invoice paid", error.message);
}

/** Invoice links use the invoice number, which never moves when milestones do. */
export function invoicePublicUrl(
  project: Pick<Project, "public_token">,
  invoiceNumber: string,
): string {
  return `${appUrl()}/p/${project.public_token}/invoice/${encodeURIComponent(invoiceNumber)}`;
}

/** A paid invoice goes back to due when its milestone is reopened. */
export async function reopenInvoiceForMilestone(db: Db, milestoneId: string): Promise<void> {
  const now = new Date().toISOString();
  const { data: open } = await db
    .from("invoices")
    .select("id")
    .eq("milestone_id", milestoneId)
    .eq("status", "sent")
    .limit(1);
  if (open?.length) return;

  const { data: latest } = await db
    .from("invoices")
    .select("id")
    .eq("milestone_id", milestoneId)
    .eq("status", "paid")
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return;

  const { error } = await db
    .from("invoices")
    .update({ status: "sent", paid_at: null, updated_at: now })
    .eq("id", latest.id);
  if (error) console.error("Could not reopen invoice", error.message);
}

/**
 * Voids the open invoice when the milestone's amount, title, or due date
 * changes, so the next send issues a fresh one instead of the stale snapshot.
 */
export async function voidOpenInvoiceForMilestone(db: Db, milestoneId: string): Promise<void> {
  const { error } = await db
    .from("invoices")
    .update({ status: "void", updated_at: new Date().toISOString() })
    .eq("milestone_id", milestoneId)
    .eq("status", "sent");
  if (error) console.error("Could not void invoice", error.message);
}

export async function listInvoicesForProject(
  db: Db,
  projectId: string,
): Promise<Invoice[]> {
  const { data, error } = await db
    .from("invoices")
    .select("*")
    .eq("project_id", projectId)
    .order("issued_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type PublicInvoiceView = NonNullable<Awaited<ReturnType<typeof getInvoiceByTokenAndPosition>>>;

/** `ref` is an invoice number (INV-0003) or, for older links, a milestone position. */
export async function getPublicInvoice(token: string, ref: string): Promise<PublicInvoiceView | null> {
  const decoded = decodeURIComponent(ref).trim();
  if (/^INV-\d{1,10}$/i.test(decoded)) return getInvoiceByTokenAndNumber(token, decoded);
  if (/^\d{1,4}$/.test(decoded)) return getInvoiceByTokenAndPosition(token, Number(decoded));
  return null;
}

async function getInvoiceByTokenAndNumber(
  token: string,
  number: string,
): Promise<PublicInvoiceView | null> {
  if (!token) return null;
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("get_invoice_by_number", {
    p_token: token,
    p_number: number,
  });
  if (error) {
    console.error("get_invoice_by_number", error.message);
    return null;
  }
  return parsePublicInvoice(data, 0);
}

export async function getInvoiceByTokenAndPosition(
  token: string,
  position: number,
): Promise<{
  invoice: {
    number: string;
    from_name: string;
    client_name: string;
    client_email: string | null;
    line_title: string;
    amount: number;
    currency: string;
    due_date: string | null;
    status: Invoice["status"];
    issued_at: string;
    paid_at: string | null;
  };
  project: { name: string; public_token: string };
  milestonePosition: number;
} | null> {
  if (!token || !Number.isInteger(position) || position < 1) return null;

  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("get_invoice_by_token", {
    p_token: token,
    p_position: position,
  });

  if (error) {
    console.error("get_invoice_by_token", error.message);
    return null;
  }
  return parsePublicInvoice(data, position);
}

function parsePublicInvoice(data: unknown, position: number) {
  if (!data || typeof data !== "object") return null;

  const row = data as {
    invoice?: {
      number: string;
      from_name: string;
      client_name: string;
      client_email: string | null;
      line_title: string;
      amount: number | string;
      currency: string;
      due_date: string | null;
      status: Invoice["status"];
      issued_at: string;
      paid_at: string | null;
    };
    project?: { name: string; public_token: string };
    milestone_position?: number;
  };

  if (!row.invoice || !row.project) return null;

  return {
    invoice: {
      ...row.invoice,
      amount: Number(row.invoice.amount),
    },
    project: row.project,
    milestonePosition: row.milestone_position ?? position,
  };
}
