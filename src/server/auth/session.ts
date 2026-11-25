import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { SessionModel, UserModel } from "@/server/db/models";
import { getEnv, isSecureOrigin } from "@/server/env";
import { generateToken, hashToken } from "@/server/auth/crypto";
import type { Role } from "@/lib/constants";

/**
 * `__Host-` prefix (https deployments) forces Secure, Path=/ and no Domain attribute,
 * so the cookie cannot be set or overridden by a subdomain.
 */
export function sessionCookieName() {
  return isSecureOrigin() ? "__Host-cb_session" : "cb_session";
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: isSecureOrigin(),
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  sessionId: string;
};

export async function createSession(userId: Types.ObjectId | string, meta: { ip?: string | null; userAgent?: string | null }) {
  await connectDB();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + getEnv().SESSION_TTL_DAYS * 24 * 3600 * 1000);
  await SessionModel.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt,
    ip: meta.ip?.slice(0, 64) ?? null,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
  });
  return { token, expiresAt };
}

/**
 * Resolve a raw session token to the active user. Returns null for unknown,
 * expired or revoked sessions and for suspended accounts. Role is always read
 * fresh from the database (never from the cookie), so role changes and
 * suspensions take effect immediately.
 */
export async function validateSessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || token.length > 100) return null;
  await connectDB();
  const session = await SessionModel.findOne({ tokenHash: hashToken(token) }).lean();
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;

  const user = await UserModel.findById(session.userId)
    .select("name email role status emailVerifiedAt passwordChangedAt")
    .lean();
  if (!user || user.status !== "ACTIVE") return null;
  // Sessions issued before a password change are invalid.
  if (user.passwordChangedAt && session.createdAt && session.createdAt < user.passwordChangedAt) return null;

  // Touch at most once every 10 minutes to avoid a write per request.
  if (!session.lastSeenAt || Date.now() - session.lastSeenAt.getTime() > 10 * 60 * 1000) {
    await SessionModel.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
  }

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    emailVerified: Boolean(user.emailVerifiedAt),
    sessionId: String(session._id),
  };
}

export async function revokeSessionToken(token: string | undefined | null) {
  if (!token) return;
  await connectDB();
  await SessionModel.deleteOne({ tokenHash: hashToken(token) });
}

export async function revokeAllSessions(userId: Types.ObjectId | string, exceptSessionId?: string) {
  await connectDB();
  const filter: Record<string, unknown> = { userId: new Types.ObjectId(String(userId)) };
  if (exceptSessionId) filter._id = { $ne: new Types.ObjectId(exceptSessionId) };
  await SessionModel.deleteMany(filter);
}
