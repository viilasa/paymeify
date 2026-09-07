import type { SupabaseClient } from "@supabase/supabase-js";

import { cronSecret, msg91Config, msg91MissingReason, resendApiKey, resendFrom } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { invoicePublicUrl } from "@/lib/invoices";
import { projectPortalUrl } from "@/lib/payments";
import { normalizePhone } from "@/lib/phone";
import type { Database } from "@/lib/supabase/types";
import type {
  Invoice,
  Milestone,
  NotificationKind,
  Profile,
  Project,
} from "@/lib/supabase/types";

type Db = SupabaseClient<Database>;

export type NotifyInput = {
  db: Db;
  project: Project;
  profile: Pick<Profile, "name" | "business_name">;
  kind: NotificationKind;
  milestone?: Pick<Milestone, "id" | "title" | "amount" | "position">;
  invoice?: Pick<Invoice, "number" | "line_title" | "amount" | "currency" | "due_date">;
  skipEmail?: boolean;
  skipSms?: boolean;
};

const REMINDER_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

export function notificationsConfigured(): { email: boolean; sms: boolean } {
  return { email: Boolean(resendApiKey()), sms: msg91MissingReason() === null };
}

function senderName(profile: Pick<Profile, "name" | "business_name">): string {
  return profile.business_name?.trim() || profile.name.trim() || "Your freelancer";
}

type SmsVars = {
  name: string;
  project: string;
  link: string;
  extra: string;
  token: string;
};

function copy(
  input: NotifyInput,
): { subject: string; preview: string; htmlBody: string; sms: string; vars: SmsVars } {
  const from = senderName(input.profile);
  const link = projectPortalUrl(input.project);
  const amount = input.milestone
    ? formatMoney(Number(input.milestone.amount), input.project.currency)
    : null;
  const vars = (extra: string): SmsVars => ({
    name: from.slice(0, 30),
    project: input.project.name.slice(0, 40),
    link,
    extra: extra.slice(0, 60),
    token: input.project.public_token,
  });

  if (input.kind === "project_created") {
    return {
      subject: `${from} shared “${input.project.name}” with you`,
      preview: `Open your project link to see milestones and pay as work is delivered.`,
      htmlBody: `<p>${escapeHtml(from)} created a project for you on Paymeify.</p>
<p><strong>${escapeHtml(input.project.name)}</strong></p>
<p>Open this link to track progress and pay each milestone as it is delivered. You do not need an account.</p>
<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`,
      sms: `${from} shared “${input.project.name}”. View and pay: ${link}`,
      vars: vars("Open your project link to track and pay."),
    };
  }

  if (input.kind === "milestone_completed") {
    const title = input.milestone?.title ?? "A milestone";
    const payLine = amount
      ? ` ${title} is complete. Please pay ${amount} on the project link.`
      : ` ${title} is complete.`;
    return {
      subject: `${title} is complete — ${input.project.name}`,
      preview: amount
        ? `${from} marked this milestone complete. Pay ${amount} on your project link.`
        : `${from} marked this milestone complete.`,
      htmlBody: `<p>${escapeHtml(from)} marked <strong>${escapeHtml(title)}</strong> complete on <strong>${escapeHtml(input.project.name)}</strong>.</p>
${amount ? `<p>Amount due: <strong>${escapeHtml(amount)}</strong></p>` : ""}
<p>Open your project link to review and pay. You do not need an account.</p>
<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`,
      sms: `${from}:${payLine} ${link}`,
      vars: vars(amount ? `${title} is complete. Please pay ${amount}.` : `${title} is complete.`),
    };
  }

  if (input.kind === "invoice_sent" && input.invoice && input.milestone) {
    const inv = input.invoice;
    const invAmount = formatMoney(Number(inv.amount), inv.currency);
    const invoiceLink = invoicePublicUrl(input.project, input.milestone.position);
    return {
      subject: `Invoice ${inv.number} — ${input.project.name}`,
      preview: `${from} sent invoice ${inv.number} for ${inv.line_title} (${invAmount}).`,
      htmlBody: `<p>${escapeHtml(from)} sent you an invoice for <strong>${escapeHtml(input.project.name)}</strong>.</p>
<p><strong>${escapeHtml(inv.number)}</strong> · ${escapeHtml(inv.line_title)} · <strong>${escapeHtml(invAmount)}</strong></p>
<p><a href="${escapeHtml(invoiceLink)}" style="display:inline-block;margin:8px 0;padding:10px 16px;background:#f5f5f5;color:#090909;border-radius:8px;text-decoration:none;font-weight:600;">View invoice</a></p>
<p>Or pay from your project link:<br/><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`,
      sms: `${from}: invoice ${inv.number} for ${inv.line_title} (${invAmount}). ${invoiceLink}`,
      vars: vars(`Invoice ${inv.number}: ${invAmount}`),
    };
  }

  const title = input.milestone?.title ?? "the current milestone";
  return {
    subject: `Payment reminder — ${input.project.name}`,
    preview: amount
      ? `${amount} is waiting on ${title}. Open your project link to pay.`
      : `A payment is waiting on ${input.project.name}.`,
    htmlBody: `<p>This is a reminder from ${escapeHtml(from)} about <strong>${escapeHtml(input.project.name)}</strong>.</p>
<p><strong>${escapeHtml(title)}</strong>${amount ? ` — ${escapeHtml(amount)}` : ""} is still unpaid.</p>
<p>Open your project link to pay. You do not need an account.</p>
<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`,
    sms: `${from}: reminder to pay ${title}${amount ? ` (${amount})` : ""}. ${link}`,
    vars: vars(
      amount ? `Reminder to pay ${title} (${amount}).` : `Reminder to pay ${title}.`,
    ),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapHtml(subject: string, inner: string): string {
  return `<!doctype html>
<html><body style="margin:0;background:#090909;color:#f5f5f5;font-family:ui-sans-serif,system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <p style="margin:0 0 24px;font-size:13px;letter-spacing:-0.02em;">Paymeify</p>
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;line-height:1.3;">${escapeHtml(subject)}</h1>
    <div style="font-size:15px;line-height:1.6;color:#c8c8c8;">${inner}</div>
    <p style="margin:28px 0 0;font-size:12px;color:#5f5f5f;">Sent via Paymeify. Anyone with the link can view this project.</p>
  </div>
</body></html>`;
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const key = resendApiKey();
  if (!key) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom(),
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Resend failed", response.status, detail);
    return false;
  }
  return true;
}

function msg91Mobile(e164: string): string {
  return e164.replace(/\D/g, "");
}

function msg91Error(detail: string, status: number): string {
  try {
    const parsed = JSON.parse(detail) as { message?: string; type?: string };
    if (parsed.message) return parsed.message;
  } catch {
    /* keep fallback */
  }
  if (detail.trim()) return detail.slice(0, 240);
  return `MSG91 rejected the SMS (${status}).`;
}

async function sendSms(
  to: string,
  body: string,
  vars: SmsVars,
): Promise<{ ok: boolean; error?: string }> {
  const missing = msg91MissingReason();
  const msg91 = msg91Config();
  if (!msg91 || missing) {
    return { ok: false, error: missing ?? "MSG91 is not configured." };
  }

  const mobiles = msg91Mobile(to);
  if (mobiles.length < 10 || mobiles.length > 15) {
    return { ok: false, error: "That client phone number is not valid." };
  }

  const headers = {
    authkey: msg91.authKey,
    "Content-Type": "application/json",
  };

  let response: Response;
  if (msg91.templateId) {
    response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers,
      body: JSON.stringify({
        template_id: msg91.templateId,
        flow_id: msg91.templateId,
        short_url: "0",
        ...(msg91.senderId ? { sender: msg91.senderId } : {}),
        recipients: [{ mobiles, ...vars }],
      }),
    });
  } else {
    response = await fetch("https://api.msg91.com/api/v2/sendsms", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sender: msg91.senderId,
        route: "4",
        country: "0",
        sms: [{ message: body.slice(0, 1000), to: [mobiles] }],
      }),
    });
  }

  const detail = await response.text().catch(() => "");
  let type: string | undefined;
  try {
    type = (JSON.parse(detail) as { type?: string }).type;
  } catch {
    /* not JSON */
  }

  if (!response.ok || type === "error") {
    console.error("MSG91 failed", response.status, detail);
    return { ok: false, error: msg91Error(detail, response.status) };
  }
  return { ok: true };
}

async function logSend(
  db: Db,
  input: NotifyInput,
  channel: "email" | "sms",
  recipient: string,
): Promise<void> {
  const { error } = await db.from("client_notifications").insert({
    project_id: input.project.id,
    milestone_id: input.milestone?.id ?? null,
    kind: input.kind,
    channel,
    recipient,
  });
  if (error) console.error("Could not log client notification", error.message);
}

export async function recentlyReminded(
  db: Db,
  projectId: string,
  milestoneId: string,
  channel?: "email" | "sms",
): Promise<boolean> {
  const since = new Date(Date.now() - REMINDER_COOLDOWN_MS).toISOString();
  let query = db
    .from("client_notifications")
    .select("id")
    .eq("project_id", projectId)
    .eq("milestone_id", milestoneId)
    .eq("kind", "payment_reminder")
    .gte("sent_at", since);
  if (channel) query = query.eq("channel", channel);
  const { data } = await query.limit(1).maybeSingle();
  return Boolean(data);
}

/**
 * Emails and/or texts the client. Missing contact details or missing provider
 * keys skip that channel. Failures never throw — creating a project must still
 * succeed if Resend/MSG91 are down.
 */
export async function notifyClient(
  input: NotifyInput,
): Promise<{ email: boolean; sms: boolean; error?: string }> {
  const result: { email: boolean; sms: boolean; error?: string } = { email: false, sms: false };
  const email = input.skipEmail ? null : input.project.client_email?.trim() || null;
  // Invoices are email-only.
  const phone =
    input.kind === "invoice_sent" || input.skipSms
      ? null
      : normalizePhone(input.project.client_phone);
  if (!email && !phone) return result;

  const message = copy(input);
  const html = wrapHtml(message.subject, message.htmlBody);
  const primaryLink =
    input.kind === "invoice_sent" && input.milestone
      ? invoicePublicUrl(input.project, input.milestone.position)
      : projectPortalUrl(input.project);
  const text = `${message.preview}\n\n${primaryLink}`;

  if (email) {
    try {
      result.email = await sendEmail(email, message.subject, html, text);
      if (result.email) await logSend(input.db, input, "email", email);
    } catch (error) {
      console.error("Email notify threw", error);
    }
  }

  if (phone) {
    try {
      const sms = await sendSms(phone, message.sms, message.vars);
      result.sms = sms.ok;
      if (sms.ok) await logSend(input.db, input, "sms", phone);
      else result.error = sms.error;
    } catch (error) {
      console.error("SMS notify threw", error);
      result.error = "SMS failed to send.";
    }
  } else if (input.kind !== "invoice_sent" && !input.skipSms && input.project.client_phone) {
    result.error = "That client phone number is not valid.";
  }

  return result;
}

export function isCronAuthorized(request: Request): boolean {
  const secret = cronSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
