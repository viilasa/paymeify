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

  const number = await nextInvoiceNumber(db, project.user_id);
  const now = new Date().toISOString();

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

  if (error || !data) {
    if (error?.code === "23505") {
      const { data: raced } = await db
        .from("invoices")
        .select("*")
        .eq("milestone_id", milestone.id)
        .eq("status", "sent")
        .maybeSingle();
      if (raced) return raced;
    }
    throw new AppError(error?.message || "Could not create the invoice.");
  }

  return data;
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

export function invoicePublicUrl(
  project: Pick<Project, "public_token">,
  position: number,
): string {
  return `${appUrl()}/p/${project.public_token}/invoice/${position}`;
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
