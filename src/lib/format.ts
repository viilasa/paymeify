export const SUPPORTED_CURRENCIES = [
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — Pound Sterling" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return SUPPORTED_CURRENCIES.some((c) => c.code === value);
}

const localeForCurrency: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

/** `₹45,000` — decimals only appear when the amount actually has them. */
export function formatMoney(amount: number, currency = "INR"): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const hasFraction = Math.abs(value % 1) > 0.004;

  return new Intl.NumberFormat(localeForCurrency[currency] ?? "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(value);
}

export function currencySymbol(currency = "INR"): string {
  const parts = new Intl.NumberFormat(localeForCurrency[currency] ?? "en-US", {
    style: "currency",
    currency,
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}

/** `12 Mar 2026`, or an em dash for a missing date. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** `01`, `02`, … used for milestone numbering. */
export function formatPosition(position: number): string {
  return String(position).padStart(2, "0");
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Razorpay works in the smallest currency unit (paise for INR). */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(amount: number): number {
  return Math.round(amount) / 100;
}
