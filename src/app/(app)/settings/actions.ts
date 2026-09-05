"use server";

import { revalidatePath } from "next/cache";

import { AppError, failure, success, toUserMessage, type ActionState } from "@/lib/action-result";
import { requireSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrorsFrom, profileSchema } from "@/lib/validation";

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { user } = await requireSession();

    const parsed = profileSchema.safeParse({
      name: formData.get("name"),
      business_name: formData.get("business_name") ?? "",
      upi_id: formData.get("upi_id") ?? "",
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
