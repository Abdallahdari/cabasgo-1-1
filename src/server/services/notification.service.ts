import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { ComplaintFollowerModel, NotificationModel } from "@/server/db/models";
import type { NotificationType } from "@/lib/constants";
import type { NotificationDTO, Paginated } from "@/types";
import { logger, serializeError } from "@/server/logger";

type Payload = { type: NotificationType; title: string; body?: string; complaintId?: Types.ObjectId | string | null };

export async function notifyUsers(userIds: (Types.ObjectId | string)[], payload: Payload) {
  const unique = [...new Set(userIds.map(String))];
  if (unique.length === 0) return;
  const docs = unique.map((userId) => ({
    userId: new Types.ObjectId(userId),
    type: payload.type,
    title: payload.title.slice(0, 160),
    body: (payload.body ?? "").slice(0, 500),
    complaintId: payload.complaintId ? new Types.ObjectId(String(payload.complaintId)) : null,
  }));
  for (let i = 0; i < docs.length; i += 500) {
    await NotificationModel.insertMany(docs.slice(i, i + 500), { ordered: false });
  }
}

/** Notify every follower of a complaint, optionally excluding the actor. Never throws. */
export async function notifyFollowers(complaintId: Types.ObjectId | string, payload: Payload, excludeUserId?: string) {
  try {
    const followers = await ComplaintFollowerModel.find({ complaintId }).select("userId").lean();
    const ids = followers.map((f) => String(f.userId)).filter((id) => id !== excludeUserId);
    await notifyUsers(ids, { ...payload, complaintId });
  } catch (err) {
    logger.error("notifications.fanout_failed", { error: serializeError(err) });
  }
}

export async function listNotifications(userId: string, page: number, pageSize: number): Promise<Paginated<NotificationDTO>> {
  await connectDB();
  const filter = { userId: new Types.ObjectId(userId) };
  const [rows, total] = await Promise.all([
    NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    NotificationModel.countDocuments(filter),
  ]);
  return {
    items: rows.map((n) => ({
      id: String(n._id),
      type: n.type as NotificationType,
      title: n.title,
      body: n.body ?? "",
      complaintId: n.complaintId ? String(n.complaintId) : null,
      read: Boolean(n.readAt),
      createdAt: (n.createdAt as Date).toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function unreadNotificationCount(userId: string) {
  await connectDB();
  return NotificationModel.countDocuments({ userId: new Types.ObjectId(userId), readAt: null });
}

/** Marks the given notifications (or all) as read — scoped to the owner. */
export async function markNotificationsRead(userId: string, ids?: string[]) {
  await connectDB();
  const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId), readAt: null };
  if (ids && ids.length > 0) filter._id = { $in: ids.map((i) => new Types.ObjectId(i)) };
  const res = await NotificationModel.updateMany(filter, { $set: { readAt: new Date() } });
  return res.modifiedCount;
}
