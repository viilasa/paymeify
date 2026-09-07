import { NextResponse, type NextRequest } from "next/server";

import { isCronAuthorized, notifyClient, recentlyReminded } from "@/lib/notify";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Daily payment reminders for the current unpaid milestone on each active project. */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createSupabaseAdminClient();
  const { data: projects, error } = await db
    .from("projects")
    .select("*")
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let emailed = 0;
  let texted = 0;
  let skipped = 0;

  for (const project of projects ?? []) {
    if (!project.client_email && !project.client_phone) {
      skipped += 1;
      continue;
    }

    const { data: milestones } = await db
      .from("milestones")
      .select("*")
      .eq("project_id", project.id)
      .order("position", { ascending: true });

    const due = (milestones ?? []).find(
      (row) => row.payment_status !== "paid" && Number(row.amount) > 0,
    );
    if (!due) {
      skipped += 1;
      continue;
    }

    if (await recentlyReminded(db, project.id, due.id)) {
      skipped += 1;
      continue;
    }

    const { data: profile } = await db
      .from("profiles")
      .select("name, business_name")
      .eq("user_id", project.user_id)
      .maybeSingle();

    const sent = await notifyClient({
      db,
      project,
      profile: profile ?? { name: "Your freelancer", business_name: null },
      kind: "payment_reminder",
      milestone: due,
    });

    if (sent.email) emailed += 1;
    if (sent.sms) texted += 1;
    if (!sent.email && !sent.sms) skipped += 1;
  }

  return NextResponse.json({ emailed, texted, skipped });
}
