import type { SupabaseClient } from "@supabase/supabase-js";

import { cronSecret, resendApiKey, resendFrom, twilioConfig } from "@/lib/env";
import { formatMoney } from "@/lib/format";
import { projectPortalUrl } from "@/lib/payments";
import { normalizePhone } from "@/lib/phone";
import type { Database } from "@/lib/supabase/types";
import type {
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
  milestone?: Pick<Milestone, "id" | "title" | "amount">;
};

const REMINDER_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

export function notificationsConfigured(): { email: boolean; sms: boolean } {
  return { email: Boolean(resendApiKey()), sms: twilioConfig() !== null };
}

function senderName(profile: Pick<Profile, "name" | "business_name">): string {
  return profile.business_name?.trim() || profile.name.trim() || "Your freelancer";
}

function copy(
  input: NotifyInput,
): { subject: string; preview: string; htmlBody: string; sms: string } {
  const from = senderName(input.profile);
  const link = projectPortalUrl(input.project);
  const amount = input.milestone
    ? formatMoney(Number(input.milestone.amount), input.project.currency)
    : null;

  if (input.kind === "project_created") {
    return {
      subject: `${from} shared “${input.project.name}” with you`,
      preview: `Open your project link to see milestones and pay as work is delivered.`,
      htmlBody: `<p>${escapeHtml(from)} created a project for you on Paymeify.</p>
<p><strong>${escapeHtml(input.project.name)}</strong></p>
<p>Open this link to track progress and pay each milestone as it is delivered. You do not need an account.</p>
<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`,
      sms: `${from} shared “${input.project.name}”. View and pay: ${link}`,
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

async function sendSms(to: string, body: string): Promise<boolean> {
  const twilio = twilioConfig();
  if (!twilio) return false;

  const params = new URLSearchParams({ To: to, Body: body.slice(0, 1500) });
  if (twilio.from.startsWith("MG")) params.set("MessagingServiceSid", twilio.from);
  else params.set("From", twilio.from);

  const auth = Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Twilio failed", response.status, detail);
    return false;
  }
  return true;
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
): Promise<boolean> {
  const since = new Date(Date.now() - REMINDER_COOLDOWN_MS).toISOString();
  const { data } = await db
    .from("client_notifications")
    .select("id")
    .eq("project_id", projectId)
    .eq("milestone_id", milestoneId)
    .eq("kind", "payment_reminder")
    .gte("sent_at", since)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Emails and/or texts the client. Missing contact details or missing provider
 * keys skip that channel. Failures never throw — creating a project must still
 * succeed if Resend/Twilio are down.
 */
export async function notifyClient(input: NotifyInput): Promise<{ email: boolean; sms: boolean }> {
  const result = { email: false, sms: false };
  const email = input.project.client_email?.trim() || null;
  const phone = normalizePhone(input.project.client_phone);
  if (!email && !phone) return result;

  const message = copy(input);
  const html = wrapHtml(message.subject, message.htmlBody);
  const text = `${message.preview}\n\n${projectPortalUrl(input.project)}`;

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
      result.sms = await sendSms(phone, message.sms);
      if (result.sms) await logSend(input.db, input, "sms", phone);
    } catch (error) {
      console.error("SMS notify threw", error);
    }
  }

  return result;
}

export function isCronAuthorized(request: Request): boolean {
  const secret = cronSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
