import { z } from "zod";

import { SUPPORTED_CURRENCIES } from "@/lib/format";

const currencyCodes = SUPPORTED_CURRENCIES.map((c) => c.code) as [string, ...string[]];

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable();

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker")
  .or(z.literal(""))
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const emailSchema = z.string().trim().min(1, "Email is required").email("Enter a valid email");

export const signupSchema = z.object({
  name: trimmed(80).min(1, "Name is required"),
  email: emailSchema,
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters").max(72),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const profileSchema = z.object({
  name: trimmed(80).min(1, "Name is required"),
  business_name: optionalText(80),
});

export const milestoneInputSchema = z.object({
  title: trimmed(120).min(1, "Milestone title is required"),
  description: optionalText(500),
  amount: z
    .number({ message: "Enter an amount" })
    .finite("Enter a valid amount")
    .min(0, "Amount cannot be negative")
    .max(99_999_999, "Amount is too large"),
  due_date: optionalDate,
});

export const projectSchema = z.object({
  name: trimmed(120).min(1, "Project name is required"),
  client_name: trimmed(120).min(1, "Client name is required"),
  client_email: z
    .string()
    .trim()
    .max(160)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Enter a valid email",
    })
    .transform((value) => (value === "" ? null : value))
    .nullable(),
  description: optionalText(1000),
  currency: z.enum(currencyCodes, { message: "Choose a currency" }),
  start_date: optionalDate,
  due_date: optionalDate,
});

export const createProjectSchema = projectSchema.extend({
  milestones: z
    .array(milestoneInputSchema)
    .min(1, "Add at least one milestone")
    .max(30, "That is a lot of milestones — keep it under 30"),
});

export const projectSettingsSchema = projectSchema.extend({
  status: z.enum(["draft", "active", "completed", "archived"]),
});

export const milestoneStatusSchema = z.enum(["pending", "in_progress", "completed"]);

/** Collapses a ZodError into `{ fieldName: firstMessage }`. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in result)) result[key] = issue.message;
  }
  return result;
}

/** Parses a money string from a form input into a number. */
export function parseAmount(value: FormDataEntryValue | null): number {
  if (typeof value !== "string") return Number.NaN;
  const cleaned = value.replace(/[,\s]/g, "");
  if (cleaned === "") return Number.NaN;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : Number.NaN;
}
