"use server";

import { revalidatePath } from "next/cache";

import { AppError, failure, success, toUserMessage, type ActionState } from "@/lib/action-result";
import { requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deleteConnection, upsertConnection } from "@/lib/payments/connections";
import {
  fieldErrorsFrom,
  paymentConnectionSchema,
  profileSchema,
  upiIdSchema,
} from "@/lib/validation";

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { user } = await requireSession();

    const parsed = profileSchema.safeParse({
      name: formData.get("name"),
      business_name: formData.get("business_name") ?? "",
    });

    if (!parsed.success) {
      return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("user_id", user.id);

    if (error) throw new AppError("Could not save your profile.");

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    // Every client portal shows the business name and the UPI QR, so they all
    // go stale the moment either changes.
    const { data: projects } = await supabase.from("projects").select("public_token");
    for (const { public_token } of projects ?? []) {
      revalidatePath(`/p/${public_token}`);
    }

    return success("Profile updated.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not save your profile."));
  }
}

export async function updateUpiAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { user } = await requireSession();
    const parsed = upiIdSchema.safeParse({ upi_id: formData.get("upi_id") ?? "" });

    if (!parsed.success) {
      return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({ upi_id: parsed.data.upi_id })
      .eq("user_id", user.id);

    if (error) throw new AppError("Could not save your UPI ID.");

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    const { data: projects } = await supabase.from("projects").select("public_token");
    for (const { public_token } of projects ?? []) {
      revalidatePath(`/p/${public_token}`);
    }

    return success(parsed.data.upi_id ? "UPI ID saved." : "UPI disconnected.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not save your UPI ID."));
  }
}

export async function connectGatewayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { user } = await requireSession();
    const parsed = paymentConnectionSchema.safeParse({
      provider: formData.get("provider"),
      key_id: formData.get("key_id") ?? "",
      secret: formData.get("secret"),
      webhook_secret: formData.get("webhook_secret"),
    });

    if (!parsed.success) {
      return failure("Check the highlighted fields.", fieldErrorsFrom(parsed.error));
    }

    await upsertConnection({
      userId: user.id,
      provider: parsed.data.provider,
      keyId: parsed.data.key_id,
      secret: parsed.data.secret,
      webhookSecret: parsed.data.webhook_secret,
    });

    const supabase = await createSupabaseServerClient();
    revalidatePath("/settings");
    const { data: projects } = await supabase.from("projects").select("public_token");
    for (const { public_token } of projects ?? []) {
      revalidatePath(`/p/${public_token}`);
    }

    return success(
      parsed.data.provider === "razorpay"
        ? "Razorpay is connected. Automatic payments are on for INR projects."
        : parsed.data.provider === "dodo"
          ? "Dodo Payments is connected. It takes any project Razorpay or Stripe does not."
          : "Stripe is connected. Automatic payments are on for non-INR projects.",
    );
  } catch (error) {
    return failure(toUserMessage(error, "Could not connect that account."));
  }
}

export async function disconnectGatewayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { user } = await requireSession();
    const provider = formData.get("provider");
    if (provider !== "razorpay" && provider !== "stripe" && provider !== "dodo") {
      return failure("Unknown payment provider.");
    }

    const supabase = await createSupabaseServerClient();

    // Disconnecting deletes the webhook secret, so payments on open checkouts
    // could never be verified or recorded.
    const { data: openLinks } = await supabase
      .from("payments")
      .select("gateway_payment_link_id")
      .eq("gateway", provider)
      .in("status", ["created", "pending"])
      .not("gateway_payment_link_id", "is", null);
    const linkIds = [
      ...new Set((openLinks ?? []).map((row) => row.gateway_payment_link_id as string)),
    ];
    if (linkIds.length) {
      const { data: open } = await supabase
        .from("milestones")
        .select("id")
        .in("payment_link_id", linkIds)
        .neq("payment_status", "paid");
      if (open?.length) {
        return failure(
          `${open.length} milestone${open.length === 1 ? " has" : "s have"} an open checkout on this account. Release ${open.length === 1 ? "it" : "them"} from the project page before disconnecting.`,
        );
      }
    }

    await deleteConnection(user.id, provider);

    revalidatePath("/settings");
    const { data: projects } = await supabase.from("projects").select("public_token");
    for (const { public_token } of projects ?? []) {
      revalidatePath(`/p/${public_token}`);
    }

    return success("Disconnected.");
  } catch (error) {
    return failure(toUserMessage(error, "Could not disconnect that account."));
  }
}
