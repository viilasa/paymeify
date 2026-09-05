/**
 * UPI collection helpers.
 *
 * UPI is an Indian rails-level standard, so everything here is INR-only. The
 * `upi://pay` URI is understood by every UPI app; encoding it as a QR is what
 * lets a client pay by scanning with their phone camera.
 *
 * Deliberately dependency-free so it can be imported from client components.
 * QR rendering lives in `upi-qr.ts`, which is server-only.
 */

/**
 * Virtual Payment Address, e.g. `priya@okhdfcbank`.
 *
 * Kept permissive on the handle length because providers disagree about the
 * minimum, and the failure modes are lopsided: a wrongly rejected VPA blocks
 * someone from getting paid at all, while a typo simply fails in the payer's
 * app with a clear message.
 */
const UPI_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/;

export function isValidUpiId(value: string): boolean {
  return UPI_ID_PATTERN.test(value.trim());
}

/** UPI settles in INR only; every other currency falls back to Razorpay. */
export function supportsUpi(currency: string): boolean {
  return currency === "INR";
}

export interface UpiUriInput {
  /** The payee's Virtual Payment Address. */
  vpa: string;
  /** Name shown in the payer's UPI app before they confirm. */
  payeeName: string;
  amount: number;
  /** Free-text note, shown as the transaction remark. */
  note?: string;
}

/**
 * Builds a `upi://pay` URI.
 *
 * Amount is fixed to two decimals because UPI apps reject `1000` where they
 * expect `1000.00`, and rounded because paise are the smallest unit that
 * exists.
 */
export function buildUpiUri({ vpa, payeeName, amount, note }: UpiUriInput): string {
  const params = new URLSearchParams({
    pa: vpa.trim(),
    pn: sanitiseForUpi(payeeName, 50),
    am: (Math.round(amount * 100) / 100).toFixed(2),
    cu: "INR",
  });

  const remark = note ? sanitiseForUpi(note, 50) : "";
  if (remark) params.set("tn", remark);

  // URLSearchParams encodes a space as "+", which is the form-encoding rule
  // rather than the URI one. UPI apps that decode strictly then show the payee
  // as "ABC+Studio", so spell spaces out as %20. Safe to replace globally
  // because sanitiseForUpi drops any literal "+" from the values first.
  return `upi://pay?${params.toString().replaceAll("+", "%20")}`;
}

/**
 * UPI apps are inconsistent about non-alphanumeric characters in `pn` and `tn`
 * — some silently truncate at the first one. Stripping them is more reliable
 * than trusting percent-encoding.
 */
function sanitiseForUpi(value: string, maxLength: number): string {
  return value
    .replace(/[^a-zA-Z0-9 .\-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
