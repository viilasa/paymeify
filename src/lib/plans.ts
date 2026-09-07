import type { PlanTier } from "@/lib/supabase/types";

/** Free trial: one project. Pro: unlimited. */
export const FREE_PROJECT_LIMIT = 1;

export const PLANS = {
  free: {
    id: "free" as const,
    name: "Free",
    priceLabel: "₹0",
    period: "forever",
    blurb: "Start shipping milestones and collecting payments.",
    features: [
      "Client project link",
      "Milestones & progress",
      "UPI, Razorpay, and Stripe",
      "Invoices & reminders",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    priceLabel: "₹399",
    period: "per month",
    blurb: "Unlimited projects for freelancers who bill more than one client.",
    features: [
      "Everything in Free",
      "Unlimited projects",
      "Priority support",
    ],
  },
} as const;

export const TRIAL_PROJECT_LIMIT_MESSAGE =
  "Only one project can be created on the free trial plan. Upgrade to Pro (₹399/month) for unlimited projects.";

export function isProPlan(plan: PlanTier | null | undefined): boolean {
  return plan === "pro";
}

export function canCreateProject(
  plan: PlanTier | null | undefined,
  existingProjectCount: number,
): boolean {
  if (isProPlan(plan)) return true;
  return existingProjectCount < FREE_PROJECT_LIMIT;
}
