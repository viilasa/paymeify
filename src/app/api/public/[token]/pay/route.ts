import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { AppError } from "@/lib/action-result";
import { isValidToken } from "@/lib/data/public-project";
import { assertPayableMilestone, ensureMilestonePaymentLink } from "@/lib/payments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ position: z.number().int().positive().max(1000) });

/**
 * Public endpoint used by the client portal to start a payment.
 *
 * Authorisation is the project token itself. The client never sends an amount
 * or an internal id — the milestone is looked up by position and priced from
 * the database.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!isValidToken(token)) return badRequest("This project link is not valid.");

    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return badRequest("That request was not understood.");

    const admin = createSupabaseAdminClient();

    const { data: project } = await admin
      .from("projects")
      .select("id, status")
      .eq("public_token", token)
      .maybeSingle();

    if (!project || project.status === "archived") {
      return NextResponse.json(
        { error: "This project link is no longer active." },
        { status: 404 },
      );
    }

    const { data: milestones } = await admin
      .from("milestones")
      .select("id, position, payment_status")
      .eq("project_id", project.id);

    if (!milestones?.length) {
      return badRequest("This project has no milestones to pay yet.");
    }

    assertPayableMilestone(milestones, body.data.position);

    const target = milestones.find((m) => m.position === body.data.position);
    if (!target) return badRequest("That milestone could not be found.");

    const link = await ensureMilestonePaymentLink(project.id, target.id);
    return NextResponse.json({ url: link.url });
  } catch (error) {
    if (error instanceof AppError) return badRequest(error.message);
    console.error("public pay route failed", error);
    return NextResponse.json(
      { error: "Something went wrong starting the payment. Try again." },
      { status: 500 },
    );
  }
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
