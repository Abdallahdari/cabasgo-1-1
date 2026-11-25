import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 32 bytes of CSPRNG output encoded as 43-char base64url. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Tokens are high-entropy random values, so a fast hash is appropriate (no
 * salt / slow KDF needed). Only this hash is ever persisted.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Complaint tracking code alphabet without ambiguous characters (0/O, 1/I). */
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function generateReferenceCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `CB-${out}`;
}
