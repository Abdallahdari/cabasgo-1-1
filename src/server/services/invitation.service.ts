import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { withTransaction } from "@/server/db/transaction";
import { EditorInvitationModel, UserModel } from "@/server/db/models";
import { generateToken, hashToken } from "@/server/auth/crypto";
import { hashPassword } from "@/server/auth/password";
import { createSession, type SessionUser } from "@/server/auth/session";
import { enforceRateLimit, LIMITS } from "@/server/auth/rate-limit";
import { can } from "@/server/authz/permissions";
import { AppError, Errors } from "@/server/http/errors";
import { audit } from "@/server/services/audit.service";
import { sendEmail } from "@/server/email";
import { emailTemplates } from "@/server/email/templates";
import type { InvitationDTO, Paginated } from "@/types";

export const INVITATION_TTL_MS = 72 * 3600 * 1000;

type Actor = SessionUser & { ip?: string };

export async function createInvitation(email: string, actor: Actor) {
  if (!can(actor.role, "invitation:manage")) throw Errors.forbidden();
  await connectDB();
  await enforceRateLimit(`invite:${actor.id}`, LIMITS.invitationPerAdmin.limit, LIMITS.invitationPerAdmin.window);

  const existing = await UserModel.findOne({ email }).select("role").lean();
  if (existing && existing.role !== "CITIZEN") {
    throw Errors.conflict("Isticmaalahan horay ayuu u yahay Tifaftire ama Maamule.");
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  const invitation = await withTransaction(async (session) => {
    // Revoke previous pending invitations for the same address.
    await EditorInvitationModel.updateMany(
      { email, acceptedAt: null, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { session },
    );
    const [inv] = await EditorInvitationModel.create(
      [{ email, tokenHash: hashToken(token), invitedById: actor.id, expiresAt }],
      { session },
    );
    await audit(actor, "invitation.create", { type: "EditorInvitation", id: String(inv._id) }, { email }, session);
    return inv;
  });

  await sendEmail(emailTemplates.editorInvitation(email, actor.name, token, expiresAt));
  return { id: String(invitation._id), expiresAt: expiresAt.toISOString() };
}

function invitationState(inv: { acceptedAt?: Date | null; revokedAt?: Date | null; expiresAt: Date }): InvitationDTO["state"] {
  if (inv.acceptedAt) return "ACCEPTED";
  if (inv.revokedAt) return "REVOKED";
  if (inv.expiresAt.getTime() <= Date.now()) return "EXPIRED";
  return "PENDING";
}

export async function listInvitations(actor: SessionUser, page: number, pageSize: number): Promise<Paginated<InvitationDTO>> {
  if (!can(actor.role, "invitation:manage")) throw Errors.forbidden();
  await connectDB();
  const [rows, total] = await Promise.all([
    EditorInvitationModel.find().sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    EditorInvitationModel.countDocuments(),
  ]);
  const inviters = await UserModel.find({ _id: { $in: rows.map((r) => r.invitedById) } }).select("name").lean();
  const names = new Map(inviters.map((u) => [String(u._id), u.name]));
  return {
    items: rows.map((r) => ({
      id: String(r._id),
      email: r.email,
      invitedBy: names.get(String(r.invitedById)) ?? "—",
      state: invitationState(r),
      expiresAt: r.expiresAt.toISOString(),
      createdAt: (r.createdAt as Date).toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function revokeInvitation(id: string, actor: Actor) {
  if (!can(actor.role, "invitation:manage")) throw Errors.forbidden();
  await connectDB();
  if (!Types.ObjectId.isValid(id)) throw Errors.notFound();
  const res = await EditorInvitationModel.updateOne(
    { _id: id, acceptedAt: null, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  if (res.modifiedCount === 0) throw Errors.conflict("Casuumaddan lama joojin karo.");
  await audit(actor, "invitation.revoke", { type: "EditorInvitation", id });
}

/** Read-only lookup for the acceptance page (does not consume the token). */
export async function inspectInvitation(token: string) {
  await connectDB();
  const inv = await EditorInvitationModel.findOne({ tokenHash: hashToken(token) }).lean();
  if (!inv || invitationState(inv) !== "PENDING") return null;
  const hasAccount = Boolean(await UserModel.exists({ email: inv.email }));
  return { email: inv.email, hasAccount, expiresAt: inv.expiresAt.toISOString() };
}

/**
 * Accept an invitation. The token is consumed with a single conditional
 * update (unused, unrevoked, unexpired), inside the same transaction that
 * creates/promotes the account, so it can never be used twice.
 *
 * - Email already has an account: the invitee must be logged in as that
 *   account; it is promoted CITIZEN -> EDITOR.
 * - No account: a new, email-verified EDITOR account is created.
 */
export async function acceptInvitation(
  input: { token: string; name?: string; password?: string },
  current: SessionUser | null,
  meta: { ip: string; userAgent: string | null },
) {
  await connectDB();
  const tokenHash = hashToken(input.token);
  const preview = await EditorInvitationModel.findOne({ tokenHash }).lean();
  if (!preview || invitationState(preview) !== "PENDING") throw Errors.gone("Casuumaddan way dhacday ama horay ayaa loo isticmaalay.");

  const existing = await UserModel.findOne({ email: preview.email }).select("_id role").lean();
  if (existing) {
    if (!current || current.id !== String(existing._id)) {
      throw new AppError(401, "LOGIN_REQUIRED", "Fadlan ku gal akoonka email-kan si aad u aqbasho casuumadda.");
    }
  } else if (!input.name || !input.password) {
    throw Errors.badRequest("Magaca iyo furaha sirta ah waa loo baahan yahay.");
  }
  const passwordHash = existing ? null : await hashPassword(input.password!);

  const userId = await withTransaction(async (session) => {
    const now = new Date();
    const inv = await EditorInvitationModel.findOneAndUpdate(
      { tokenHash, acceptedAt: null, revokedAt: null, expiresAt: { $gt: now } },
      { $set: { acceptedAt: now } },
      { returnDocument: "after", session },
    ).lean();
    if (!inv) throw Errors.gone("Casuumaddan way dhacday ama horay ayaa loo isticmaalay.");

    let uid: Types.ObjectId;
    if (existing) {
      // Never demote an ADMIN through an invitation.
      await UserModel.updateOne({ _id: existing._id, role: "CITIZEN" }, { $set: { role: "EDITOR" } }, { session });
      await UserModel.updateOne({ _id: existing._id, emailVerifiedAt: null }, { $set: { emailVerifiedAt: now } }, { session });
      uid = existing._id as Types.ObjectId;
    } else {
      const [u] = await UserModel.create(
        [{ name: input.name!, email: inv.email, passwordHash: passwordHash!, role: "EDITOR" as const, emailVerifiedAt: now }],
        { session },
      );
      uid = u._id;
    }
    await EditorInvitationModel.updateOne({ _id: inv._id }, { $set: { acceptedById: uid } }, { session });
    await audit(
      { id: String(uid), role: "EDITOR", ip: meta.ip },
      "invitation.accept",
      { type: "EditorInvitation", id: String(inv._id) },
      { email: inv.email, newAccount: !existing },
      session,
    );
    return uid;
  });

  const session = existing ? null : await createSession(userId, meta);
  return { userId: String(userId), session };
}
