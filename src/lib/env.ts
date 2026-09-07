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

/** Purchased production host. Used for SEO, OG, and Google OAuth return. */
export const PRODUCTION_ORIGIN = "https://www.paymeify.com";
export const PRODUCTION_HOST = "www.paymeify.com";

function isLocalOrigin(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);
}

function hostnameOf(url: string): string {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname;
  } catch {
    return "";
  }
}

function isVercelAppHost(url: string): boolean {
  return hostnameOf(url).endsWith(".vercel.app");
}

/** Public origin used to build client-portal, OG, and payment callback URLs. */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";

  if (explicit && !isLocalOrigin(explicit) && !isVercelAppHost(explicit)) {
    return explicit;
  }

  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_ORIGIN;
  }

  const preview = process.env.VERCEL_URL?.trim();
  if (preview) return `https://${preview.replace(/\/$/, "")}`;

  if (explicit) return explicit;
  return "http://localhost:3000";
}

export function resendApiKey(): string | undefined {
  return firstEnv("RESEND_API_KEY");
}

export function resendFrom(): string {
  return firstEnv("RESEND_FROM") ?? "Paymeify <hello@paymeify.com>";
}

export function twilioConfig():
  | { accountSid: string; authToken: string; from: string }
  | null {
  const accountSid = firstEnv("TWILIO_ACCOUNT_SID");
  const authToken = firstEnv("TWILIO_AUTH_TOKEN");
  const from = firstEnv("TWILIO_FROM");
  if (!accountSid || !authToken || !from) return null;
  return { accountSid, authToken, from };
}

export function cronSecret(): string | undefined {
  return firstEnv("CRON_SECRET");
}
