import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { isValidToken } from "@/lib/data/public-project";
import { notifyFreelancerOfPayment } from "@/lib/notify";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import { paymentReportSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ~8 UPI claims per project+IP per 10 minutes. */
const REPORT_LIMIT = 8;
const REPORT_WINDOW_MS = 10 * 60_000;

/**
 * A client telling us they sent a UPI transfer.
 *
 * All the real work is in the `report_payment_by_token` database function, which
 * runs as SECURITY DEFINER and re-checks everything this route checks. That
 * keeps the rules in one place and means an anonymous caller poking at the
 * function directly gets the same treatment as one going through the app.
 *
 * This records a claim only (milestone → pending). It never marks paid.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!isValidToken(token)) return badRequest("This project link is not valid.");

    const limited = rateLimit(
      `report:${token}:${clientIp(request)}`,
      REPORT_LIMIT,
      REPORT_WINDOW_MS,
    );
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many payment reports. Wait a few minutes and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const body = paymentReportSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return badRequest(
        body.error.issues[0]?.message ?? "That request was not understood.",
      );
    }

    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase.rpc("report_payment_by_token", {
      p_token: token,
      p_position: body.data.position,
      p_reference: body.data.reference,
    });

    if (error) {
      console.error("report_payment_by_token failed", error);
      return NextResponse.json(
        { error: "Something went wrong. Try again." },
        { status: 500 },
      );
    }

    const result = data as { ok?: boolean; error?: string } | null;
    if (!result?.ok) {
      return badRequest(result?.error ?? "Could not record that. Try again.");
    }

    // Best-effort ping so the freelancer can confirm UPI quickly.
    void emailFreelancerUpiReport(token, body.data.position).catch((err) => {
      console.error("freelancer UPI report email failed", err);
    });

    revalidatePath(`/p/${token}`);
    revalidatePath("/dashboard", "layout");
    revalidatePath("/projects");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("report-payment route failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}

async function emailFreelancerUpiReport(token: string, position: number) {
  const admin = createSupabaseAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, name, client_name, currency, user_id")
    .eq("public_token", token)
    .maybeSingle();
  if (!project) return;

  const { data: milestone } = await admin
    .from("milestones")
    .select("title, amount")
    .eq("project_id", project.id)
    .eq("position", position)
    .maybeSingle();
  if (!milestone) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("name, email")
    .eq("user_id", project.user_id)
    .maybeSingle();

  await notifyFreelancerOfPayment({
    toEmail: profile?.email,
    freelancerName: profile?.name ?? "there",
    projectName: project.name,
    clientName: project.client_name,
    milestoneTitle: milestone.title,
    amount: Number(milestone.amount),
    currency: project.currency,
    projectId: project.id,
    kind: "reported",
    source: "upi",
  });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
