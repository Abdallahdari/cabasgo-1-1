import "server-only";
import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id with OWASP-recommended parameters (19 MiB, t=2, p=1).
 * algorithm 2 === Algorithm.Argon2id (a const enum, so we pass the value).
 */
const OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch {
    return false;
  }
}

// Used to equalise timing when the account does not exist.
let dummyHash: Promise<string> | null = null;
export async function verifyAgainstDummy(plain: string): Promise<false> {
  dummyHash ??= hashPassword("codka-bulshada-dummy-password-0");
  await verifyPassword(await dummyHash, plain);
  return false;
}
