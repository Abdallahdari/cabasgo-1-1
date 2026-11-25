import "server-only";
import { Types, type ClientSession } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { withTransaction } from "@/server/db/transaction";
import {
  CategoryModel,
  CityModel,
  CommentModel,
  ComplaintFollowerModel,
  ComplaintImageModel,
  ComplaintLikeModel,
  ComplaintModel,
  ComplaintStatusHistoryModel,
  ContentReportModel,
  DistrictModel,
  NotificationModel,
  UserModel,
} from "@/server/db/models";
import { generateReferenceCode } from "@/server/auth/crypto";
import { enforceRateLimit, LIMITS } from "@/server/auth/rate-limit";
import { can } from "@/server/authz/permissions";
import type { SessionUser } from "@/server/auth/session";
import { AppError, Errors } from "@/server/http/errors";
import { serializeComplaint, serializeComplaints, type ComplaintLean } from "@/server/services/serializers";
import { notifyFollowers, notifyUsers } from "@/server/services/notification.service";
import { audit } from "@/server/services/audit.service";
import { deleteObjects, isStorageConfigured } from "@/server/storage";
import { sendEmailSafe } from "@/server/email";
import { emailTemplates } from "@/server/email/templates";
import { STATUS_LABELS, STATUS_TRANSITIONS, type ComplaintStatus } from "@/lib/constants";
import type {
  CreateComplaintInput,
  ListComplaintsQuery,
  ModerateComplaintInput,
} from "@/lib/validation";
import type { ComplaintDTO, Paginated, StatusHistoryDTO } from "@/types";
import { logger, serializeError } from "@/server/logger";

const oid = (id: string) => new Types.ObjectId(id);

type Actor = SessionUser & { ip?: string };

// ---------------------------------------------------------------------------
// Validation helpers

async function assertLocationAndCategory(input: {
  categoryId?: string;
  regionId?: string;
  cityId?: string;
  districtId?: string | null;
}) {
  if (input.categoryId) {
    const ok = await CategoryModel.exists({ _id: input.categoryId, active: true });
    if (!ok) throw Errors.badRequest("Qaybta la doortay ma jirto.");
  }
  if (input.cityId) {
    const city = await CityModel.findOne({ _id: input.cityId, active: true }).lean();
    if (!city || String(city.regionId) !== input.regionId) {
      throw Errors.badRequest("Magaaladu kama tirsana gobolka la doortay.");
    }
  }
  if (input.districtId) {
    const district = await DistrictModel.findOne({ _id: input.districtId, active: true }).lean();
    if (!district || String(district.cityId) !== input.cityId) {
      throw Errors.badRequest("Degmadu kama tirsana magaalada la doortay.");
    }
  }
}

/**
 * Loads a complaint the viewer is allowed to see. Unpublished complaints are
 * visible only to their owner and to staff; everyone else gets 404 so the
 * existence of hidden content is not revealed.
 */
export async function loadVisibleComplaint(id: string, viewer: SessionUser | null): Promise<ComplaintLean> {
  await connectDB();
  if (!Types.ObjectId.isValid(id)) throw Errors.notFound("Cabashada lama helin.");
  const doc = (await ComplaintModel.findById(id).lean()) as ComplaintLean | null;
  if (!doc) throw Errors.notFound("Cabashada lama helin.");
  if (doc.visibility === "PUBLISHED") return doc;
  const isOwner = viewer && String(doc.authorId) === viewer.id;
  if (isOwner || can(viewer?.role, "complaint:view-unpublished")) return doc;
  throw Errors.notFound("Cabashada lama helin.");
}

// ---------------------------------------------------------------------------
// Queries

export async function getComplaint(id: string, viewer: SessionUser | null): Promise<ComplaintDTO> {
  const doc = await loadVisibleComplaint(id, viewer);
  return serializeComplaint(doc, viewer);
}

function paginate<T>(items: T[], page: number, pageSize: number, total: number): Paginated<T> {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listPublicComplaints(
  query: ListComplaintsQuery,
  viewer: SessionUser | null,
): Promise<Paginated<ComplaintDTO>> {
  await connectDB();
  const filter: Record<string, unknown> = { visibility: "PUBLISHED" };
  if (query.status) filter.status = query.status;
  if (query.categoryId) filter.categoryId = oid(query.categoryId);
  if (query.regionId) filter.regionId = oid(query.regionId);
  if (query.cityId) filter.cityId = oid(query.cityId);
  if (query.districtId) filter.districtId = oid(query.districtId);
  if (query.q) filter.$text = { $search: query.q };

  const sort: Record<string, 1 | -1> =
    query.sort === "top" ? { likeCount: -1, publishedAt: -1 } : { publishedAt: -1, _id: -1 };

  const [docs, total] = await Promise.all([
    ComplaintModel.find(filter)
      .sort(sort)
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .lean(),
    ComplaintModel.countDocuments(filter),
  ]);
  const items = await serializeComplaints(docs as ComplaintLean[], viewer);
  return paginate(items, query.page, query.pageSize, total);
}

export async function listMyComplaints(user: SessionUser, page: number, pageSize: number) {
  await connectDB();
  const filter = { authorId: oid(user.id) };
  const [docs, total] = await Promise.all([
    ComplaintModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    ComplaintModel.countDocuments(filter),
  ]);
  return paginate(await serializeComplaints(docs as ComplaintLean[], user), page, pageSize, total);
}

export async function listFollowedComplaints(user: SessionUser, page: number, pageSize: number) {
  await connectDB();
  const follows = await ComplaintFollowerModel.find({ userId: oid(user.id) }).select("complaintId").lean();
  const filter = { _id: { $in: follows.map((f) => f.complaintId) }, visibility: "PUBLISHED" as const };
  const [docs, total] = await Promise.all([
    ComplaintModel.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    ComplaintModel.countDocuments(filter),
  ]);
  return paginate(await serializeComplaints(docs as ComplaintLean[], user), page, pageSize, total);
}

export async function listModerationQueue(actor: SessionUser, page: number, pageSize: number) {
  if (!can(actor.role, "complaint:moderate")) throw Errors.forbidden();
  await connectDB();
  const filter = { visibility: "PENDING" as const };
  const [docs, total] = await Promise.all([
    ComplaintModel.find(filter).sort({ createdAt: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    ComplaintModel.countDocuments(filter),
  ]);
  return paginate(await serializeComplaints(docs as ComplaintLean[], actor), page, pageSize, total);
}

export async function getStatusHistory(id: string, viewer: SessionUser | null): Promise<StatusHistoryDTO[]> {
  const doc = await loadVisibleComplaint(id, viewer);
  const rows = await ComplaintStatusHistoryModel.find({ complaintId: doc._id }).sort({ createdAt: 1 }).lean();
  const staff = await UserModel.find({ _id: { $in: rows.map((r) => r.changedById) } }).select("name").lean();
  const names = new Map(staff.map((s) => [String(s._id), s.name]));
  return rows.map((r) => ({
    id: String(r._id),
    fromStatus: (r.fromStatus ?? null) as ComplaintStatus | null,
    toStatus: r.toStatus as ComplaintStatus,
    note: r.note ?? "",
    changedBy: names.get(String(r.changedById)) ?? "Maamulka",
    createdAt: (r.createdAt as Date).toISOString(),
  }));
}

export async function getPlatformStats() {
  await connectDB();
  const [published, resolved, inProgress, pending] = await Promise.all([
    ComplaintModel.countDocuments({ visibility: "PUBLISHED" }),
    ComplaintModel.countDocuments({ visibility: "PUBLISHED", status: "RESOLVED" }),
    ComplaintModel.countDocuments({ visibility: "PUBLISHED", status: { $in: ["ACKNOWLEDGED", "IN_PROGRESS"] } }),
    ComplaintModel.countDocuments({ visibility: "PENDING" }),
  ]);
  return { published, resolved, inProgress, pending };
}

export async function getUserStats(userId: string) {
  await connectDB();
  const uid = oid(userId);
  const [submitted, resolved, following] = await Promise.all([
    ComplaintModel.countDocuments({ authorId: uid }),
    ComplaintModel.countDocuments({ authorId: uid, status: "RESOLVED" }),
    ComplaintFollowerModel.countDocuments({ userId: uid }),
  ]);
  return { submitted, resolved, following };
}

// ---------------------------------------------------------------------------
// Commands

export async function createComplaint(input: CreateComplaintInput, actor: Actor): Promise<ComplaintDTO> {
  await connectDB();
  await enforceRateLimit(
    `complaint:create:${actor.id}`,
    LIMITS.createComplaintPerUser.limit,
    LIMITS.createComplaintPerUser.window,
  );
  await assertLocationAndCategory(input);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const created = await withTransaction(async (session) => {
        const [complaint] = await ComplaintModel.create(
          [
            {
              referenceCode: generateReferenceCode(),
              title: input.title,
              body: input.body,
              categoryId: input.categoryId,
              regionId: input.regionId,
              cityId: input.cityId,
              districtId: input.districtId ?? null,
              locationDetail: input.locationDetail ?? "",
              authorId: actor.id,
              isAnonymous: input.isAnonymous,
              visibility: "PENDING",
              status: "OPEN",
              followerCount: 1,
            },
          ],
          { session },
        );
        // The owner automatically follows their complaint to receive updates.
        await ComplaintFollowerModel.create([{ complaintId: complaint._id, userId: actor.id }], { session });
        return complaint;
      });
      return serializeComplaint(created.toObject() as ComplaintLean, actor);
    } catch (err) {
      const dupRef = (err as { code?: number; keyPattern?: Record<string, unknown> }).code === 11000 &&
        (err as { keyPattern?: Record<string, unknown> }).keyPattern?.referenceCode;
      if (!dupRef) throw err;
    }
  }
  throw new AppError(500, "REFERENCE_COLLISION", "Cillad ayaa dhacday. Fadlan mar kale isku day.");
}

/** Owners can edit their complaint only while it awaits moderation. */
export async function updateComplaint(id: string, input: Partial<CreateComplaintInput>, actor: Actor) {
  const doc = await loadVisibleComplaint(id, actor);
  if (String(doc.authorId) !== actor.id) throw Errors.forbidden();
  if (doc.visibility !== "PENDING") {
    throw Errors.conflict("Cabashada waa la beddeli karaa oo keliya inta ay sugayso dib-u-eegis.");
  }
  const merged = {
    categoryId: input.categoryId ?? String(doc.categoryId),
    regionId: input.regionId ?? String(doc.regionId),
    cityId: input.cityId ?? String(doc.cityId),
    districtId: input.districtId === undefined ? (doc.districtId ? String(doc.districtId) : null) : input.districtId,
  };
  await assertLocationAndCategory(merged);
  const updated = (await ComplaintModel.findOneAndUpdate(
    { _id: doc._id, authorId: oid(actor.id), visibility: "PENDING" },
    { $set: { ...input, ...merged, districtId: merged.districtId ?? null } },
    { returnDocument: "after", runValidators: true },
  ).lean()) as ComplaintLean | null;
  if (!updated) throw Errors.conflict("Cabashada lama beddeli karo hadda.");
  return serializeComplaint(updated, actor);
}

/**
 * Owners may delete their own complaint while it is PENDING or REJECTED.
 * Admins may delete any complaint. All dependent rows are removed atomically;
 * S3 objects are deleted after the transaction commits.
 */
export async function deleteComplaint(id: string, actor: Actor) {
  const doc = await loadVisibleComplaint(id, actor);
  const isOwner = String(doc.authorId) === actor.id;
  const ownerCanDelete = isOwner && (doc.visibility === "PENDING" || doc.visibility === "REJECTED");
  if (!ownerCanDelete && actor.role !== "ADMIN") throw Errors.forbidden();

  const keys = await withTransaction(async (session) => {
    const images = await ComplaintImageModel.find({ complaintId: doc._id }).select("key").session(session ?? null).lean();
    const filter = { complaintId: doc._id };
    await Promise.all([
      ComplaintImageModel.deleteMany(filter, { session }),
      ComplaintLikeModel.deleteMany(filter, { session }),
      ComplaintFollowerModel.deleteMany(filter, { session }),
      CommentModel.deleteMany(filter, { session }),
      ComplaintStatusHistoryModel.deleteMany(filter, { session }),
      NotificationModel.deleteMany(filter, { session }),
      ContentReportModel.deleteMany(filter, { session }),
    ]);
    await ComplaintModel.deleteOne({ _id: doc._id }, { session });
    if (!isOwner) {
      await audit(actor, "complaint.delete", { type: "Complaint", id }, { referenceCode: doc.referenceCode }, session);
    }
    return images.map((i) => i.key);
  });

  if (keys.length > 0 && isStorageConfigured()) {
    try {
      await deleteObjects(keys);
    } catch (err) {
      // Leftover objects are unreachable (no DB row) and get removed by the orphan sweep.
      logger.error("s3.delete_failed", { error: serializeError(err), count: keys.length });
    }
  }
}

const MODERATION: Record<
  ModerateComplaintInput["action"],
  { from: string[]; to: string; notify?: "COMPLAINT_PUBLISHED" | "COMPLAINT_REJECTED" | "COMPLAINT_HIDDEN" }
> = {
  APPROVE: { from: ["PENDING", "REJECTED"], to: "PUBLISHED", notify: "COMPLAINT_PUBLISHED" },
  REJECT: { from: ["PENDING"], to: "REJECTED", notify: "COMPLAINT_REJECTED" },
  HIDE: { from: ["PUBLISHED"], to: "HIDDEN", notify: "COMPLAINT_HIDDEN" },
  RESTORE: { from: ["HIDDEN"], to: "PUBLISHED" },
};

export async function moderateComplaint(id: string, input: ModerateComplaintInput, actor: Actor) {
  if (!can(actor.role, "complaint:moderate")) throw Errors.forbidden();
  const doc = await loadVisibleComplaint(id, actor);
  const rule = MODERATION[input.action];
  if (!rule.from.includes(doc.visibility)) {
    throw Errors.conflict("Ficilkan laguma samayn karo xaaladda hadda ee cabashada.");
  }

  const now = new Date();
  const updated = await withTransaction(async (session) => {
    const set: Record<string, unknown> = {
      visibility: rule.to,
      moderatedById: oid(actor.id),
      moderatedAt: now,
      moderationNote: input.note ?? "",
    };
    if (input.action === "APPROVE" && !doc.publishedAt) set.publishedAt = now;

    // Conditional on the visibility we validated, so concurrent moderators cannot double-apply.
    const res = (await ComplaintModel.findOneAndUpdate(
      { _id: doc._id, visibility: doc.visibility },
      { $set: set },
      { returnDocument: "after", session },
    ).lean()) as ComplaintLean | null;
    if (!res) throw Errors.conflict("Cabashada waa la beddelay. Fadlan dib u cusbooneysii bogga.");

    if (input.action === "APPROVE" && !doc.publishedAt) {
      await ComplaintStatusHistoryModel.create(
        [{ complaintId: doc._id, fromStatus: null, toStatus: res.status, changedById: actor.id, note: "Cabashada waa la ansixiyay oo la daabacay." }],
        { session },
      );
    }
    await audit(actor, `complaint.${input.action.toLowerCase()}`, { type: "Complaint", id }, { note: input.note ?? "" }, session);
    return res;
  });

  if (rule.notify) {
    const titles = {
      COMPLAINT_PUBLISHED: "Cabashadaada waa la daabacay",
      COMPLAINT_REJECTED: "Cabashadaada lama aqbalin",
      COMPLAINT_HIDDEN: "Cabashadaada waa la qariyay",
    };
    await notifyUsers([String(doc.authorId)], {
      type: rule.notify,
      title: titles[rule.notify],
      body: input.note ? `${doc.title} — ${input.note}` : doc.title,
      complaintId: doc._id,
    }).catch((err) => logger.error("notify.failed", { error: serializeError(err) }));

    if (input.action === "APPROVE" || input.action === "REJECT") {
      const owner = await UserModel.findById(doc.authorId).select("name email notifyByEmail").lean();
      if (owner?.notifyByEmail) {
        await sendEmailSafe(
          emailTemplates.moderationResult(owner.email, owner.name, doc.title, input.action === "APPROVE", input.note ?? "", id),
        );
      }
    }
  }
  return serializeComplaint(updated, actor);
}

export async function changeComplaintStatus(
  id: string,
  input: { status: ComplaintStatus; note: string },
  actor: Actor,
) {
  if (!can(actor.role, "complaint:change-status")) throw Errors.forbidden();
  const doc = await loadVisibleComplaint(id, actor);
  if (doc.visibility !== "PUBLISHED") throw Errors.conflict("Xaaladda waa la beddeli karaa oo keliya cabashooyinka la daabacay.");
  const from = doc.status as ComplaintStatus;
  if (!STATUS_TRANSITIONS[from].includes(input.status)) {
    throw Errors.badRequest(`Lagama beddeli karo "${STATUS_LABELS[from]}" loona beddeli karo "${STATUS_LABELS[input.status]}".`);
  }

  const updated = await withTransaction(async (session) => {
    const set: Record<string, unknown> = { status: input.status };
    set.resolvedAt = input.status === "RESOLVED" ? new Date() : null;
    const res = (await ComplaintModel.findOneAndUpdate(
      { _id: doc._id, status: from, visibility: "PUBLISHED" },
      { $set: set },
      { returnDocument: "after", session },
    ).lean()) as ComplaintLean | null;
    if (!res) throw Errors.conflict("Xaaladda waa la beddelay. Fadlan dib u cusbooneysii bogga.");
    await ComplaintStatusHistoryModel.create(
      [{ complaintId: doc._id, fromStatus: from, toStatus: input.status, changedById: actor.id, note: input.note }],
      { session },
    );
    await audit(actor, "complaint.status_change", { type: "Complaint", id }, { from, to: input.status }, session);
    return res;
  });

  const label = STATUS_LABELS[input.status];
  await notifyFollowers(
    doc._id,
    { type: "STATUS_CHANGED", title: `Xaalad cusub: ${label}`, body: input.note ? `${doc.title} — ${input.note}` : doc.title },
    actor.id,
  );
  const owner = await UserModel.findById(doc.authorId).select("name email notifyByEmail").lean();
  if (owner?.notifyByEmail && String(owner._id) !== actor.id) {
    await sendEmailSafe(emailTemplates.statusChanged(owner.email, owner.name, doc.title, label, id, input.note));
  }
  return serializeComplaint(updated, actor);
}

async function toggleRelation(
  kind: "like" | "follow",
  id: string,
  actor: SessionUser,
  on: boolean,
): Promise<{ active: boolean; count: number }> {
  const doc = await loadVisibleComplaint(id, actor);
  if (doc.visibility !== "PUBLISHED") throw Errors.conflict("Cabashadan weli lama daabicin.");
  const Model = kind === "like" ? ComplaintLikeModel : ComplaintFollowerModel;
  const counter = kind === "like" ? "likeCount" : "followerCount";

  return withTransaction(async (session: ClientSession | undefined) => {
    const key = { complaintId: doc._id, userId: oid(actor.id) };
    let delta = 0;
    if (on) {
      try {
        const res = await Model.updateOne(key, { $setOnInsert: key }, { upsert: true, session });
        if (res.upsertedCount === 1) delta = 1;
      } catch (err) {
        // A concurrent identical request already created the row: no-op.
        if ((err as { code?: number }).code !== 11000) throw err;
      }
    } else {
      const res = await Model.deleteOne(key, { session });
      if (res.deletedCount === 1) delta = -1;
    }
    const updated = delta
      ? await ComplaintModel.findOneAndUpdate(
          { _id: doc._id },
          { $inc: { [counter]: delta } },
          { returnDocument: "after", session },
        ).lean()
      : await ComplaintModel.findById(doc._id).session(session ?? null).lean();
    return { active: on, count: (updated?.[counter] as number) ?? 0 };
  });
}

export const setLike = (id: string, actor: SessionUser, on: boolean) => toggleRelation("like", id, actor, on);
export const setFollow = (id: string, actor: SessionUser, on: boolean) => toggleRelation("follow", id, actor, on);

