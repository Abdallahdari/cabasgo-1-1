import "server-only";
import type { ClientSession } from "mongoose";
import { AdminAuditLogModel, UserModel } from "@/server/db/models";
import type { SessionUser } from "@/server/auth/session";
import type { AuditLogDTO, Paginated } from "@/types";

export type AuditActor = Pick<SessionUser, "id" | "role"> & { ip?: string | null };

export async function audit(
  actor: AuditActor,
  action: string,
  target: { type: string; id?: string | null },
  metadata: Record<string, unknown> = {},
  session?: ClientSession,
) {
  await AdminAuditLogModel.create(
    [
      {
        actorId: actor.id,
        actorRole: actor.role,
        action,
        targetType: target.type,
        targetId: target.id ?? null,
        metadata,
        ip: actor.ip ?? null,
      },
    ],
    { session },
  );
}

export async function listAuditLogs(page: number, pageSize: number): Promise<Paginated<AuditLogDTO>> {
  const [rows, total] = await Promise.all([
    AdminAuditLogModel.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    AdminAuditLogModel.countDocuments(),
  ]);
  const actors = await UserModel.find({ _id: { $in: rows.map((r) => r.actorId) } })
    .select("name")
    .lean();
  const names = new Map(actors.map((a) => [String(a._id), a.name]));
  return {
    items: rows.map((r) => ({
      id: String(r._id),
      actor: names.get(String(r.actorId)) ?? "—",
      actorRole: r.actorRole,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId ?? null,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
      createdAt: (r.createdAt as Date).toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
