import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { isValidToken } from "@/lib/data/public-project";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import { paymentReportSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A client telling us they sent a UPI transfer.
 *
 * All the real work is in the `report_payment_by_token` database function, which
 * runs as SECURITY DEFINER and re-checks everything this route checks. That
 * keeps the rules in one place and means an anonymous caller poking at the
 * function directly gets the same treatment as one going through the app.
 *
 * This records a claim only. It never touches the milestone's payment status, so
 * holding a project link does not let anyone mark themselves paid.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!isValidToken(token)) return badRequest("This project link is not valid.");

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

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
