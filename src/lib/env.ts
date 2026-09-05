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

export function razorpayKeyId(): string {
  return read("RAZORPAY_KEY_ID", process.env.RAZORPAY_KEY_ID);
}

export function razorpayKeySecret(): string {
  return read("RAZORPAY_KEY_SECRET", process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayWebhookSecret(): string {
  return read("RAZORPAY_WEBHOOK_SECRET", process.env.RAZORPAY_WEBHOOK_SECRET);
}

/** True when Razorpay credentials are configured, without throwing. */
export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim(),
  );
}

/** Public origin used to build client-portal and payment callback URLs. */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ??
    process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
