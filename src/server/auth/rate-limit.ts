import "server-only";
import { connectDB } from "@/server/db/connect";
import { RateLimitModel } from "@/server/db/models";
import { Errors } from "@/server/http/errors";

/**
 * Fixed-window counters stored in MongoDB so limits are shared across all
 * ECS tasks behind the load balancer. Expired windows are TTL-deleted.
 */
function windowKey(key: string, windowSeconds: number, now = Date.now()) {
  const bucket = Math.floor(now / (windowSeconds * 1000));
  return { id: `${key}:${bucket}`, resetAt: new Date((bucket + 1) * windowSeconds * 1000) };
}

export async function hitRateLimit(key: string, limit: number, windowSeconds: number) {
  await connectDB();
  const { id, resetAt } = windowKey(key, windowSeconds);
  const upsert = () =>
    RateLimitModel.findOneAndUpdate(
      { key: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: resetAt } },
      { upsert: true, returnDocument: "after" },
    ).lean();
  let doc;
  try {
    doc = await upsert();
  } catch (err) {
    // Two concurrent first hits can race on the unique key; the retry updates.
    if ((err as { code?: number }).code !== 11000) throw err;
    doc = await upsert();
  }
  const count = doc?.count ?? 1;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
  };
}

export async function peekRateLimit(key: string, limit: number, windowSeconds: number) {
  await connectDB();
  const { id, resetAt } = windowKey(key, windowSeconds);
  const doc = await RateLimitModel.findOne({ key: id }).lean();
  const count = doc?.count ?? 0;
  return {
    allowed: count < limit,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000)),
  };
}

export async function clearRateLimit(key: string, windowSeconds: number) {
  await connectDB();
  await RateLimitModel.deleteOne({ key: windowKey(key, windowSeconds).id });
}

/** Throws 429 when the limit is exceeded. */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const res = await hitRateLimit(key, limit, windowSeconds);
  if (!res.allowed) throw Errors.tooMany(res.retryAfterSeconds);
}

export const LIMITS = {
  loginPerIp: { limit: 30, window: 15 * 60 },
  loginFailuresPerEmail: { limit: 5, window: 15 * 60 },
  registerPerIp: { limit: 10, window: 60 * 60 },
  emailSendPerIp: { limit: 10, window: 60 * 60 },
  emailSendPerAddress: { limit: 3, window: 60 * 60 },
  createComplaintPerUser: { limit: 10, window: 60 * 60 },
  commentPerUser: { limit: 30, window: 10 * 60 },
  uploadPresignPerUser: { limit: 40, window: 60 * 60 },
  reportPerUser: { limit: 20, window: 60 * 60 },
  invitationPerAdmin: { limit: 30, window: 60 * 60 },
} as const;
