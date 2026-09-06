import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Encrypts freelancer gateway secrets at rest.
 *
 * PAYMENT_SECRETS_KEY is a platform secret. Freelancer keys never leave the
 * server in the clear — Settings only sees status and a last-4 hint.
 */
function keyMaterial(): Buffer {
  const raw = process.env.PAYMENT_SECRETS_KEY?.trim();
  if (!raw) {
    throw new Error(
      "Missing PAYMENT_SECRETS_KEY. Add a long random string to .env.local so we can encrypt payment keys.",
    );
  }
  return scryptSync(raw, "paymeify-payment-connections", 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Stored payment secret is corrupted.");
  }
  const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function lastFour(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return trimmed;
  return trimmed.slice(-4);
}
