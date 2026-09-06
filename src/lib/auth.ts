import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export interface Session {
  user: User;
  profile: Profile;
}

/**
 * Loads the signed-in freelancer and their profile, or redirects to /login.
 * Every authenticated page and action starts here.
 */
export async function requireSession(): Promise<Session> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile) return { user, profile };

  // The auth trigger normally creates this row. Self-heal if it is missing so
  // an account created before the trigger existed still works.
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      name:
        (user.user_metadata?.name as string | undefined)?.trim() ||
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        user.email?.split("@")[0] ||
        "There",
      email: user.email ?? "",
      business_name:
        (user.user_metadata?.business_name as string | undefined)?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(`Could not load profile: ${error?.message ?? "unknown error"}`);
  }

  return { user, profile: created };
}

export function displayName(profile: Profile): string {
  return profile.name.trim() || profile.email.split("@")[0] || "there";
}
