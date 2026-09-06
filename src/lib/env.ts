/**
 * Environment access.
 *
 * Everything is read lazily so a missing secret surfaces as a clear runtime
 * error on the request that needs it, instead of breaking the build.
 *
 * Supabase also accepts `VITE_SUPABASE_*` and unprefixed `SUPABASE_*` names so
 * a Vercel / dashboard project that was set up with Vite-style keys still works.
 */

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function read(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value.trim();
}

export function supabaseUrl(): string {
  return read(
    "NEXT_PUBLIC_SUPABASE_URL",
    firstEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "VITE_SUPABASE_URL"),
  );
}

export function supabaseAnonKey(): string {
  return read(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    firstEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY",
      "VITE_SUPABASE_ANON_KEY",
    ),
  );
}

export function isSupabaseConfigured(): boolean {
  return supabasePublicConfig() !== null;
}

/** URL + anon key, or null when this deployment has no Supabase credentials. */
export function supabasePublicConfig(): { url: string; anonKey: string } | null {
  const url = firstEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
  );
  const anonKey = firstEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
  );
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function supabaseServiceRoleKey(): string {
  return read("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isLocalOrigin(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

/** Public origin used to build client-portal, OG, and payment callback URLs. */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ??
    process.env.VERCEL_URL?.trim();

  // A leftover localhost value in Vercel env must not win on a deployed build.
  if (explicit && !isLocalOrigin(explicit)) return explicit;
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, "")}`;
  if (explicit) return explicit;
  return "http://localhost:3000";
}
