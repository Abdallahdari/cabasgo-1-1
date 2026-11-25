import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { withTransaction } from "@/server/db/transaction";
import { SessionModel, UserModel } from "@/server/db/models";
import { can } from "@/server/authz/permissions";
import type { SessionUser } from "@/server/auth/session";
import { Errors } from "@/server/http/errors";
import { audit } from "@/server/services/audit.service";
import type { Role, UserStatus } from "@/lib/constants";
import type { AdminUserDTO, CurrentUserDTO, Paginated } from "@/types";

type Actor = SessionUser & { ip?: string };

export function toCurrentUserDTO(u: SessionUser): CurrentUserDTO {
  return { id: u.id, name: u.name, email: u.email, role: u.role, emailVerified: u.emailVerified };
}

/** Self-service profile update. Role and status are not updatable here (schema is strict). */
export async function updateOwnProfile(
  user: SessionUser,
  input: { name?: string; regionId?: string | null; notifyByEmail?: boolean },
) {
  await connectDB();
  const set: Record<string, unknown> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.regionId !== undefined) set.regionId = input.regionId;
  if (input.notifyByEmail !== undefined) set.notifyByEmail = input.notifyByEmail;
  await UserModel.updateOne({ _id: user.id }, { $set: set }, { runValidators: true });
}

export async function getOwnProfile(userId: string) {
  await connectDB();
  const u = await UserModel.findById(userId).select("name email role regionId notifyByEmail emailVerifiedAt createdAt").lean();
  if (!u) throw Errors.notFound();
  return {
    name: u.name,
    email: u.email,
    role: u.role as Role,
    regionId: u.regionId ? String(u.regionId) : null,
    notifyByEmail: u.notifyByEmail ?? true,
    emailVerified: Boolean(u.emailVerifiedAt),
    createdAt: (u.createdAt as Date).toISOString(),
  };
}

export async function listUsers(
  actor: SessionUser,
  opts: { page: number; pageSize: number; q?: string; role?: Role },
): Promise<Paginated<AdminUserDTO>> {
  if (!can(actor.role, "user:manage")) throw Errors.forbidden();
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (opts.role) filter.role = opts.role;
  if (opts.q) {
    const rx = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [rows, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * opts.pageSize)
      .limit(opts.pageSize)
      .lean(),
    UserModel.countDocuments(filter),
  ]);
  return {
    items: rows.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role as Role,
      status: u.status as UserStatus,
      emailVerified: Boolean(u.emailVerifiedAt),
      createdAt: (u.createdAt as Date).toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    })),
    page: opts.page,
    pageSize: opts.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / opts.pageSize)),
  };
}

/**
 * Admin changes to another user's status or role.
 * - Admins cannot modify themselves (no self-promotion/demotion/suspension).
 * - Admin accounts cannot be modified through the API.
 * - Only CITIZEN <-> EDITOR role changes are allowed.
 * Suspension revokes all of the user's sessions immediately.
 */
export async function adminUpdateUser(
  targetId: string,
  input: { status?: UserStatus; role?: "CITIZEN" | "EDITOR" },
  actor: Actor,
) {
  if (!can(actor.role, "user:manage")) throw Errors.forbidden();
  if (!Types.ObjectId.isValid(targetId)) throw Errors.notFound();
  if (targetId === actor.id) throw Errors.forbidden("Ma beddeli kartid doorkaaga ama xaaladdaada.");
  await connectDB();

  await withTransaction(async (session) => {
    const target = await UserModel.findById(targetId).session(session ?? null).lean();
    if (!target) throw Errors.notFound("Isticmaalaha lama helin.");
    if (target.role === "ADMIN") throw Errors.forbidden("Akoonnada maamulayaasha halkan lagama beddeli karo.");

    const set: Record<string, unknown> = {};
    if (input.status) set.status = input.status;
    if (input.role) set.role = input.role;
    await UserModel.updateOne({ _id: target._id, role: { $ne: "ADMIN" } }, { $set: set }, { session });
    if (input.status === "SUSPENDED") await SessionModel.deleteMany({ userId: target._id }, { session });

    await audit(
      actor,
      "user.update",
      { type: "User", id: targetId },
      { from: { role: target.role, status: target.status }, to: input },
      session,
    );
  });
}
