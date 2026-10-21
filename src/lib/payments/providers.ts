import crypto from "node:crypto";
import DodoPayments from "dodopayments";
import type { Currency as DodoCurrency } from "dodopayments/resources/misc";
import Razorpay from "razorpay";
import Stripe from "stripe";

import { AppError } from "@/lib/action-result";
import { toMinorUnits } from "@/lib/format";
import type { PaymentProvider } from "@/lib/supabase/types";

export interface GatewayCredentials {
  /** Dodo has no key id; it stores the detected mode ("live" | "test") here. */
  keyId: string;
  secret: string;
  webhookSecret: string;
}

export interface CreateCheckoutInput {
  amount: number;
  currency: string;
  description: string;
  projectId: string;
  milestoneId: string;
  customerName: string;
  customerEmail: string | null;
  callbackUrl: string;
  cancelUrl: string;
}

export interface CreatedCheckout {
  id: string;
  url: string;
  provider: PaymentProvider;
  /** Dodo only: the one-off product behind the session. */
  productId?: string;
}

/**
 * Gateways that can take a project's currency, in order of preference.
 * Dodo Payments is the fallback for every currency.
 */
export function providerCandidates(currency: string): PaymentProvider[] {
  return currency === "INR" ? ["razorpay", "dodo"] : ["stripe", "dodo"];
}

export const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  razorpay: "Razorpay",
  stripe: "Stripe",
  dodo: "Dodo Payments",
};

export async function createCheckout(
  provider: PaymentProvider,
  credentials: GatewayCredentials,
  input: CreateCheckoutInput,
): Promise<CreatedCheckout> {
  if (provider === "razorpay") return createRazorpayLink(credentials, input);
  if (provider === "dodo") return createDodoCheckout(credentials, input);
  return createStripeCheckout(credentials, input);
}

export async function cancelCheckout(
  provider: PaymentProvider,
  credentials: GatewayCredentials,
  checkoutId: string,
  options?: { productId?: string },
): Promise<void> {
  if (provider === "razorpay") {
    try {
      await razorpayClient(credentials).paymentLink.cancel(checkoutId);
    } catch (error) {
      console.warn("razorpay.paymentLink.cancel failed", error);
    }
    return;
  }

  // Dodo has no endpoint to void a checkout session, but archiving the
  // session's one-off product stops it selling. When the product id isn't
  // known, a late payment is still recorded and flagged by the settle step.
  if (provider === "dodo") {
    if (options?.productId) await archiveDodoProducts(credentials, [options.productId]);
    return;
  }

  try {
    await stripeClient(credentials.secret).checkout.sessions.expire(checkoutId);
  } catch (error) {
    console.warn("stripe.checkout.sessions.expire failed", error);
  }
}

export type CheckoutLookup =
  | {
      state: "paid";
      paymentId: string | null;
      amountMinor: number;
      currency?: string;
    }
  | { state: "open" }
  | { state: "closed"; reason: "expired" | "cancelled" }
  | { state: "unknown" };

/** Ask the provider what happened to a checkout — used by the reconcile cron. */
export async function fetchCheckoutStatus(
  provider: PaymentProvider,
  credentials: GatewayCredentials,
  checkoutId: string,
): Promise<CheckoutLookup> {
  if (provider === "razorpay") {
    try {
      const link = await razorpayClient(credentials).paymentLink.fetch(checkoutId);
      const status = String(link.status ?? "");
      if (status === "paid") {
        const amountMinor = Number(link.amount_paid ?? link.amount ?? 0);
        return {
          state: "paid",
          paymentId: null,
          amountMinor,
          currency: typeof link.currency === "string" ? link.currency : undefined,
        };
      }
      if (status === "expired") return { state: "closed", reason: "expired" };
      if (status === "cancelled") return { state: "closed", reason: "cancelled" };
      // created | partially_paid — still open; do not treat partial as settled
      return { state: "open" };
    } catch (error) {
      console.warn("razorpay.paymentLink.fetch failed", error);
      return { state: "unknown" };
    }
  }

  if (provider === "dodo") return fetchDodoCheckoutStatus(credentials, checkoutId);

  try {
    const session = await stripeClient(credentials.secret).checkout.sessions.retrieve(
      checkoutId,
    );
    if (session.payment_status === "paid" || session.status === "complete") {
      return {
        state: "paid",
        paymentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
        amountMinor: session.amount_total ?? 0,
        currency: session.currency?.toUpperCase(),
      };
    }
    if (session.status === "expired") return { state: "closed", reason: "expired" };
    return { state: "open" };
  } catch (error) {
    console.warn("stripe.checkout.sessions.retrieve failed", error);
    return { state: "unknown" };
  }
}

export async function pingProvider(
  provider: PaymentProvider,
  credentials: GatewayCredentials,
): Promise<void> {
  if (provider === "razorpay") {
    // A cheap authenticated call — fails fast on a bad key.
    await razorpayClient(credentials).payments.all({ count: 1 });
    return;
  }
  if (provider === "dodo") {
    await dodoClient(credentials).products.list({ page_size: 1 });
    return;
  }
  await stripeClient(credentials.secret).balance.retrieve();
}

export function verifyWebhookSignature(
  provider: PaymentProvider,
  webhookSecret: string,
  rawBody: string,
  signature: string,
): boolean {
  if (provider === "razorpay") {
    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    const received = Buffer.from(signature, "utf8");
    const computed = Buffer.from(expected, "utf8");
    if (received.length !== computed.length) return false;
    return crypto.timingSafeEqual(received, computed);
  }

  // Dodo uses Standard Webhooks headers; verify with dodoClient().webhooks.unwrap.
  if (provider === "dodo") return false;

  try {
    stripeClient("sk_unused").webhooks.constructEvent(rawBody, signature, webhookSecret);
    return true;
  } catch {
    return false;
  }
}

function razorpayClient(credentials: GatewayCredentials) {
  return new Razorpay({ key_id: credentials.keyId, key_secret: credentials.secret });
}

function stripeClient(secret: string) {
  return new Stripe(secret);
}

export function dodoClient(credentials: Pick<GatewayCredentials, "keyId" | "secret">) {
  return new DodoPayments({
    bearerToken: credentials.secret,
    environment: credentials.keyId === "test" ? "test_mode" : "live_mode",
    webhookKey: null,
  });
}

/**
 * Dodo keys do not say which mode they belong to, so try live first and fall
 * back to test. Throws when neither accepts the key.
 */
export async function detectDodoMode(apiKey: string): Promise<"live" | "test"> {
  for (const mode of ["live", "test"] as const) {
    try {
      await pingProvider("dodo", { keyId: mode, secret: apiKey, webhookSecret: "" });
      return mode;
    } catch (error) {
      if (!(error instanceof DodoPayments.AuthenticationError)) throw error;
    }
  }
  throw new AppError("Dodo Payments rejected that API key.");
}

async function createRazorpayLink(
  credentials: GatewayCredentials,
  input: CreateCheckoutInput,
): Promise<CreatedCheckout> {
  const amount = toMinorUnits(input.amount);
  if (!Number.isInteger(amount) || amount < 100) {
    throw new AppError("Razorpay needs an amount of at least 1.00 in the project currency.");
  }

  try {
    const link = await razorpayClient(credentials).paymentLink.create({
      amount,
      currency: input.currency,
      description: input.description.slice(0, 250),
      accept_partial: false,
      reminder_enable: true,
      callback_url: input.callbackUrl,
      callback_method: "get",
      customer: {
        name: input.customerName.slice(0, 100),
        ...(input.customerEmail ? { email: input.customerEmail } : {}),
      },
      notify: { email: Boolean(input.customerEmail), sms: false },
      notes: {
        project_id: input.projectId,
        milestone_id: input.milestoneId,
      },
    });

    if (!link.id || !link.short_url) {
      throw new AppError("Razorpay did not return a usable payment link.");
    }

    return { id: link.id, url: link.short_url, provider: "razorpay" };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("razorpay.paymentLink.create failed", error);
    throw new AppError(
      readRazorpayError(error) ?? "Could not reach Razorpay. Check your keys and try again.",
    );
  }
}

async function createStripeCheckout(
  credentials: GatewayCredentials,
  input: CreateCheckoutInput,
): Promise<CreatedCheckout> {
  const amount = toMinorUnits(input.amount);
  if (!Number.isInteger(amount) || amount < 50) {
    throw new AppError("Stripe needs an amount of at least 0.50 in the project currency.");
  }

  try {
    const session = await stripeClient(credentials.secret).checkout.sessions.create({
      mode: "payment",
      success_url: input.callbackUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail ?? undefined,
      metadata: {
        project_id: input.projectId,
        milestone_id: input.milestoneId,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: amount,
            product_data: { name: input.description.slice(0, 120) },
          },
        },
      ],
    });

    if (!session.id || !session.url) {
      throw new AppError("Stripe did not return a usable checkout session.");
    }

    return { id: session.id, url: session.url, provider: "stripe" };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("stripe.checkout.sessions.create failed", error);
    throw new AppError("Could not reach Stripe. Check your secret key and try again.");
  }
}

async function createDodoCheckout(
  credentials: GatewayCredentials,
  input: CreateCheckoutInput,
): Promise<CreatedCheckout> {
  const amount = toMinorUnits(input.amount);
  if (!Number.isInteger(amount) || amount < 100) {
    throw new AppError("Dodo Payments needs an amount of at least 1.00 in the project currency.");
  }

  const client = dodoClient(credentials);
  try {
    // Checkout sessions only sell products, so each milestone gets its own
    // one-time product at the exact amount. Tax-inclusive keeps the total the
    // client pays equal to the milestone amount the settle step checks.
    const product = await client.products.create({
      name: input.description.slice(0, 120),
      price: {
        type: "one_time_price",
        currency: input.currency as DodoCurrency,
        price: amount,
        tax_inclusive: true,
        purchasing_power_parity: false,
      },
      tax_category: "digital_products",
      metadata: {
        project_id: input.projectId,
        milestone_id: input.milestoneId,
      },
    });

    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: product.product_id, quantity: 1 }],
      ...(input.customerEmail
        ? { customer: { email: input.customerEmail, name: input.customerName.slice(0, 100) } }
        : {}),
      return_url: input.callbackUrl,
      cancel_url: input.cancelUrl,
      metadata: {
        project_id: input.projectId,
        milestone_id: input.milestoneId,
      },
    });

    if (!session.session_id || !session.checkout_url) {
      throw new AppError("Dodo Payments did not return a usable checkout session.");
    }

    return {
      id: session.session_id,
      url: session.checkout_url,
      provider: "dodo",
      productId: product.product_id,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("dodo.checkoutSessions.create failed", error);
    throw new AppError(
      readDodoError(error) ?? "Could not reach Dodo Payments. Check your API key and try again.",
    );
  }
}

/** Archives Dodo's one-off milestone products once they've done their job. */
export async function archiveDodoProducts(
  credentials: GatewayCredentials,
  productIds: string[],
): Promise<void> {
  const client = dodoClient(credentials);
  await Promise.all(
    productIds.map((id) =>
      client.products.archive(id).catch((error: unknown) => {
        console.warn("dodo.products.archive failed", id, error);
      }),
    ),
  );
}

async function fetchDodoCheckoutStatus(
  credentials: GatewayCredentials,
  checkoutId: string,
): Promise<CheckoutLookup> {
  try {
    const client = dodoClient(credentials);
    const session = await client.checkoutSessions.retrieve(checkoutId);
    if (session.payment_status === "succeeded" && session.payment_id) {
      const payment = await client.payments.retrieve(session.payment_id);
      return {
        state: "paid",
        paymentId: payment.payment_id,
        amountMinor: payment.total_amount,
        currency: payment.currency,
      };
    }
    if (session.payment_status === "cancelled") return { state: "closed", reason: "cancelled" };
    // No payment yet, processing, or failed (the client can retry) — still open.
    return { state: "open" };
  } catch (error) {
    console.warn("dodo.checkoutSessions.retrieve failed", error);
    return { state: "unknown" };
  }
}

function readDodoError(error: unknown): string | null {
  if (!(error instanceof DodoPayments.APIError)) return null;
  const body = error.error as { message?: unknown } | undefined;
  const value = body?.message;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readRazorpayError(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const description = error as { error?: { description?: unknown }; description?: unknown };
  const value = description.error?.description ?? description.description;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}
