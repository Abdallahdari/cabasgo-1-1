import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { withTransaction } from "@/server/db/transaction";
import { AuthTokenModel, UserModel, type AuthTokenType } from "@/server/db/models";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/server/auth/password";
import { generateToken, hashToken } from "@/server/auth/crypto";
import { createSession, revokeAllSessions } from "@/server/auth/session";
import { clearRateLimit, enforceRateLimit, hitRateLimit, LIMITS, peekRateLimit } from "@/server/auth/rate-limit";
import { AppError, Errors } from "@/server/http/errors";
import { sendEmail } from "@/server/email";
import { emailTemplates } from "@/server/email/templates";
import type { LoginInput, RegisterInput } from "@/lib/validation";
import { logger } from "@/server/logger";
import { getEnv } from "@/server/env";

type Meta = { ip: string; userAgent: string | null };

const TOKEN_TTL: Record<AuthTokenType, number> = {
  EMAIL_VERIFICATION: 24 * 3600 * 1000,
  PASSWORD_RESET: 3600 * 1000,
};

async function issueAuthToken(userId: Types.ObjectId, type: AuthTokenType) {
  const token = generateToken();
  // Only one live token per user and purpose.
  await AuthTokenModel.deleteMany({ userId, type, usedAt: null });
  await AuthTokenModel.create({
    type,
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL[type]),
  });
  return token;
}

export async function registerUser(input: RegisterInput, meta: Meta) {
  await connectDB();
  await enforceRateLimit(`register:ip:${meta.ip}`, LIMITS.registerPerIp.limit, LIMITS.registerPerIp.window);

  const existing = await UserModel.exists({ email: input.email });
  if (existing) throw Errors.conflict("Email-kan horay ayaa loo diiwaangeliyay.");

  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: "CITIZEN", // always; never derived from input
  });
  if (getEnv().REQUIRE_EMAIL_VERIFICATION) {
    const token = await issueAuthToken(user._id, "EMAIL_VERIFICATION");
    await sendEmail(emailTemplates.verifyEmail(user.email, user.name, token));
  }

  const session = await createSession(user._id, meta);
  return { user, session };
}

export async function loginUser(input: LoginInput, meta: Meta) {
  await connectDB();
  await enforceRateLimit(`login:ip:${meta.ip}`, LIMITS.loginPerIp.limit, LIMITS.loginPerIp.window);

  const failKey = `login:fail:${input.email}`;
  const { limit, window } = LIMITS.loginFailuresPerEmail;
  const gate = await peekRateLimit(failKey, limit, window);
  if (!gate.allowed) throw Errors.tooMany(gate.retryAfterSeconds);

  const user = await UserModel.findOne({ email: input.email }).select("+passwordHash");
  const ok = user ? await verifyPassword(user.passwordHash, input.password) : await verifyAgainstDummy(input.password);

  if (!user || !ok) {
    await hitRateLimit(failKey, limit, window);
    throw new AppError(401, "INVALID_CREDENTIALS", "Email-ka ama furaha sirta ah waa khalad.");
  }
  if (user.status !== "ACTIVE") {
    throw new AppError(403, "ACCOUNT_SUSPENDED", "Akoonkan waa la hakiyay. La xiriir maamulka.");
  }

  await clearRateLimit(failKey, window);
  await UserModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  const session = await createSession(user._id, meta);
  return { user, session };
}

export async function verifyEmail(token: string) {
  await connectDB();
  return withTransaction(async (session) => {
    const doc = await AuthTokenModel.findOneAndUpdate(
      { tokenHash: hashToken(token), type: "EMAIL_VERIFICATION", usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { returnDocument: "after", session },
    ).lean();
    if (!doc) throw Errors.gone();
    await UserModel.updateOne(
      { _id: doc.userId, emailVerifiedAt: null },
      { $set: { emailVerifiedAt: new Date() } },
      { session },
    );
    return { userId: String(doc.userId) };
  });
}

export async function resendVerification(userId: string, meta: Meta) {
  await connectDB();
  await enforceRateLimit(`email:ip:${meta.ip}`, LIMITS.emailSendPerIp.limit, LIMITS.emailSendPerIp.window);
  await enforceRateLimit(`email:user:${userId}`, LIMITS.emailSendPerAddress.limit, LIMITS.emailSendPerAddress.window);
  const user = await UserModel.findById(userId);
  if (!user) throw Errors.notFound();
  if (user.emailVerifiedAt) return { alreadyVerified: true };
  const token = await issueAuthToken(user._id, "EMAIL_VERIFICATION");
  await sendEmail(emailTemplates.verifyEmail(user.email, user.name, token));
  return { alreadyVerified: false };
}

/**
 * Always resolves the same way whether or not the email exists, so the
 * endpoint cannot be used to enumerate accounts.
 */
export async function requestPasswordReset(email: string, meta: Meta) {
  await connectDB();
  await enforceRateLimit(`email:ip:${meta.ip}`, LIMITS.emailSendPerIp.limit, LIMITS.emailSendPerIp.window);
  const perAddress = await hitRateLimit(
    `email:reset:${email}`,
    LIMITS.emailSendPerAddress.limit,
    LIMITS.emailSendPerAddress.window,
  );
  if (!perAddress.allowed) return;

  const user = await UserModel.findOne({ email, status: "ACTIVE" });
  if (!user) return;
  const token = await issueAuthToken(user._id, "PASSWORD_RESET");
  try {
    await sendEmail(emailTemplates.passwordReset(user.email, user.name, token));
  } catch (err) {
    logger.error("auth.reset_email_failed", { error: (err as Error).message });
  }
}

export async function resetPassword(token: string, newPassword: string) {
  await connectDB();
  const passwordHash = await hashPassword(newPassword);
  const userId = await withTransaction(async (session) => {
    const doc = await AuthTokenModel.findOneAndUpdate(
      { tokenHash: hashToken(token), type: "PASSWORD_RESET", usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { returnDocument: "after", session },
    ).lean();
    if (!doc) throw Errors.gone();
    // Resetting via email also proves ownership of the address.
    await UserModel.updateOne(
      { _id: doc.userId },
      { $set: { passwordHash, passwordChangedAt: new Date() } },
      { session },
    );
    await UserModel.updateOne(
      { _id: doc.userId, emailVerifiedAt: null },
      { $set: { emailVerifiedAt: new Date() } },
      { session },
    );
    return doc.userId;
  });
  // Log out everywhere.
  await revokeAllSessions(userId);
}

export async function changePassword(userId: string, currentSessionId: string, current: string, next: string) {
  await connectDB();
  const user = await UserModel.findById(userId).select("+passwordHash");
  if (!user || !(await verifyPassword(user.passwordHash, current))) {
    throw new AppError(400, "INVALID_PASSWORD", "Furaha sirta ah ee hadda waa khalad.");
  }
  user.passwordHash = await hashPassword(next);
  await user.save();
  // Revoke all other sessions; keep the current one.
  await revokeAllSessions(user._id, currentSessionId);
}

