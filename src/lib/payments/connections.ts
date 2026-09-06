import { AppError } from "@/lib/action-result";
import { decryptSecret, encryptSecret, lastFour } from "@/lib/payments/secrets";
import {
  pingProvider,
  providerForCurrency,
  type GatewayCredentials,
} from "@/lib/payments/providers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  PaymentConnection,
  PaymentConnectionPublic,
  PaymentProvider,
} from "@/lib/supabase/types";

export function toPublicConnection(row: PaymentConnection): PaymentConnectionPublic {
  return {
    provider: row.provider,
    keyHint: lastFour(row.key_id),
    status: row.status,
  };
}

export async function listMyConnections(): Promise<PaymentConnectionPublic[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment_connections")
    .select("*")
    .order("provider");

  if (error) throw new AppError("Could not load payment connections.");
  return (data ?? []).map(toPublicConnection);
}

export async function ownerHasAutoPay(
  userId: string,
  currency: string,
): Promise<boolean> {
  const provider = providerForCurrency(currency);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("payment_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("status", "connected")
    .maybeSingle();
  return Boolean(data);
}

/** Service-role read: used by the public pay route and webhooks. */
export async function loadOwnerCredentials(
  userId: string,
  provider: PaymentProvider,
): Promise<GatewayCredentials | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("payment_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("status", "connected")
    .maybeSingle();

  if (!data) return null;
  return decryptConnection(data);
}

export async function loadCredentialsForProject(
  projectId: string,
  provider: PaymentProvider,
): Promise<{ userId: string; credentials: GatewayCredentials } | null> {
  const admin = createSupabaseAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return null;
  const credentials = await loadOwnerCredentials(project.user_id, provider);
  if (!credentials) return null;
  return { userId: project.user_id, credentials };
}

export function decryptConnection(row: PaymentConnection): GatewayCredentials {
  return {
    keyId: row.key_id,
    secret: decryptSecret(row.secret_encrypted),
    webhookSecret: decryptSecret(row.webhook_secret_encrypted),
  };
}

export async function upsertConnection(input: {
  userId: string;
  provider: PaymentProvider;
  keyId: string;
  secret: string;
  webhookSecret: string;
}): Promise<PaymentConnectionPublic> {
  const credentials: GatewayCredentials = {
    keyId: input.keyId.trim(),
    secret: input.secret.trim(),
    webhookSecret: input.webhookSecret.trim(),
  };

  try {
    await pingProvider(input.provider, credentials);
  } catch (error) {
    console.error("payment connection test failed", error);
    throw new AppError(
      input.provider === "razorpay"
        ? "Razorpay rejected those keys. Check Key ID and Key Secret."
        : "Stripe rejected that secret key. Check it starts with sk_ and try again.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment_connections")
    .upsert(
      {
        user_id: input.userId,
        provider: input.provider,
        key_id: credentials.keyId,
        secret_encrypted: encryptSecret(credentials.secret),
        webhook_secret_encrypted: encryptSecret(credentials.webhookSecret),
        status: "connected",
      },
      { onConflict: "user_id,provider" },
    )
    .select("*")
    .single();

  if (error || !data) throw new AppError("Could not save those keys.");
  return toPublicConnection(data);
}

export async function deleteConnection(
  userId: string,
  provider: PaymentProvider,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("payment_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) throw new AppError("Could not disconnect that account.");
}
