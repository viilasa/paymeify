import crypto from "node:crypto";
import Razorpay from "razorpay";
import Stripe from "stripe";

import { AppError } from "@/lib/action-result";
import { toMinorUnits } from "@/lib/format";
import type { PaymentProvider } from "@/lib/supabase/types";

export interface GatewayCredentials {
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
}

export function providerForCurrency(currency: string): PaymentProvider {
  return currency === "INR" ? "razorpay" : "stripe";
}

export async function createCheckout(
  provider: PaymentProvider,
  credentials: GatewayCredentials,
  input: CreateCheckoutInput,
): Promise<CreatedCheckout> {
  if (provider === "razorpay") return createRazorpayLink(credentials, input);
  return createStripeCheckout(credentials, input);
}

export async function cancelCheckout(
  provider: PaymentProvider,
  credentials: GatewayCredentials,
  checkoutId: string,
): Promise<void> {
  if (provider === "razorpay") {
    try {
      await razorpayClient(credentials).paymentLink.cancel(checkoutId);
    } catch (error) {
      console.warn("razorpay.paymentLink.cancel failed", error);
    }
    return;
  }

  try {
    await stripeClient(credentials.secret).checkout.sessions.expire(checkoutId);
  } catch (error) {
    console.warn("stripe.checkout.sessions.expire failed", error);
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

function readRazorpayError(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const description = error as { error?: { description?: unknown }; description?: unknown };
  const value = description.error?.description ?? description.description;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}
