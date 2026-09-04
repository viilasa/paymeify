import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Request-scoped Supabase client bound to the user's auth cookies.
 * Every query it runs is subject to Row Level Security.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render, where cookies are read-only.
          // Middleware already refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Anonymous client with no session. Used for the public client portal, which
 * reads through a SECURITY DEFINER function keyed on the project token.
 */
export function createSupabaseAnonClient() {
  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {},
    },
  });
}
