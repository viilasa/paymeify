import crypto from "node:crypto";
import Razorpay from "razorpay";

import { AppError } from "@/lib/action-result";
import { razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret } from "@/lib/env";
import { toMinorUnits } from "@/lib/format";

function client() {
  return new Razorpay({ key_id: razorpayKeyId(), key_secret: razorpayKeySecret() });
}

export interface CreatePaymentLinkInput {
  amount: number;
  currency: string;
  description: string;
  projectId: string;
  milestoneId: string;
  customerName: string;
  customerEmail: string | null;
  callbackUrl: string;
}

export interface CreatedPaymentLink {
  id: string;
  shortUrl: string;
}

/**
 * Creates a Razorpay Payment Link for one milestone.
 * The milestone and project ids travel in `notes` so the webhook can find them
 * again without trusting anything sent by the browser.
 */
export async function createPaymentLink(
  input: CreatePaymentLinkInput,
): Promise<CreatedPaymentLink> {
  const amount = toMinorUnits(input.amount);
  if (!Number.isInteger(amount) || amount < 100) {
    throw new AppError(
      "Razorpay needs an amount of at least 1.00 in the project currency.",
    );
  }

  try {
    const link = await client().paymentLink.create({
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

    return { id: link.id, shortUrl: link.short_url };
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("razorpay.paymentLink.create failed", error);
    throw new AppError(
      readRazorpayError(error) ??
        "Could not reach Razorpay. Check your API keys and try again.",
    );
  }
}

export async function cancelPaymentLink(paymentLinkId: string): Promise<void> {
  try {
    await client().paymentLink.cancel(paymentLinkId);
  } catch (error) {
    // A link that is already paid or cancelled cannot be cancelled again.
    console.warn("razorpay.paymentLink.cancel failed", error);
  }
}

/** Timing-safe comparison of the `x-razorpay-signature` header. */
export function isValidWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", razorpayWebhookSecret())
    .update(rawBody)
    .digest("hex");

  const received = Buffer.from(signature, "utf8");
  const computed = Buffer.from(expected, "utf8");

  if (received.length !== computed.length) return false;
  return crypto.timingSafeEqual(received, computed);
}

function readRazorpayError(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const description = (
    error as { error?: { description?: unknown }; description?: unknown }
  );
  const value = description.error?.description ?? description.description;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}
