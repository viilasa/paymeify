import { createClient } from "@supabase/supabase-js";

import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Service-role client. Bypasses RLS, so it is confined to the two places that
 * genuinely need it: creating payment links and processing Razorpay webhooks.
 *
 * Must never be imported into a Client Component.
 */
export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("The Supabase admin client is server-only.");
  }

  return createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
