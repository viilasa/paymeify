/**
 * Environment access.
 *
 * Everything is read lazily so a missing secret surfaces as a clear runtime
 * error on the request that needs it, instead of breaking the build.
 */

function read(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value.trim();
}

export function supabaseUrl(): string {
  return read("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return read(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
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
