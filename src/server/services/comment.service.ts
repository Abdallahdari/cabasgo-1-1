import "server-only";
import { Types } from "mongoose";
import { withTransaction } from "@/server/db/transaction";
import { CommentModel, ComplaintModel, UserModel } from "@/server/db/models";
import { can, isStaff } from "@/server/authz/permissions";
import type { SessionUser } from "@/server/auth/session";
import { enforceRateLimit, LIMITS } from "@/server/auth/rate-limit";
import { Errors } from "@/server/http/errors";
import { loadVisibleComplaint } from "@/server/services/complaint.service";
import { notifyFollowers } from "@/server/services/notification.service";
import { audit } from "@/server/services/audit.service";
import type { Role } from "@/lib/constants";
import type { CommentDTO, Paginated } from "@/types";

type Actor = SessionUser & { ip?: string };

export async function listComments(
  complaintId: string,
  viewer: SessionUser | null,
  page: number,
  pageSize: number,
): Promise<Paginated<CommentDTO>> {
  const complaint = await loadVisibleComplaint(complaintId, viewer);
  const staff = isStaff(viewer?.role);
  const filter: Record<string, unknown> = { complaintId: complaint._id };
  if (!staff) filter.hiddenAt = null;

  const [rows, total] = await Promise.all([
    CommentModel.find(filter).sort({ createdAt: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    CommentModel.countDocuments(filter),
  ]);
  const authors = await UserModel.find({ _id: { $in: rows.filter((r) => !r.isAnonymous).map((r) => r.authorId) } })
    .select("name role")
    .lean();
  const map = new Map(authors.map((a) => [String(a._id), a]));

  return {
    items: rows.map((c) => {
      const a = c.isAnonymous ? undefined : map.get(String(c.authorId));
      return {
        id: String(c._id),
        body: c.body,
        author: a ? { name: a.name, role: a.role as Role } : null,
        isOfficial: Boolean(c.isOfficial),
        isAnonymous: Boolean(c.isAnonymous),
        isOwnComment: Boolean(viewer && String(c.authorId) === viewer.id),
        hidden: Boolean(c.hiddenAt),
        createdAt: (c.createdAt as Date).toISOString(),
      };
    }),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createComment(complaintId: string, input: { body: string; official: boolean }, actor: Actor) {
  const complaint = await loadVisibleComplaint(complaintId, actor);
  if (complaint.visibility !== "PUBLISHED") throw Errors.conflict("Faallo laguma dari karo cabasho aan la daabicin.");
  await enforceRateLimit(`comment:${actor.id}`, LIMITS.commentPerUser.limit, LIMITS.commentPerUser.window);

  const isOfficial = input.official && can(actor.role, "comment:official");
  // The anonymous owner's comments stay anonymous so they cannot be identified.
  const isAnonymous = complaint.isAnonymous && String(complaint.authorId) === actor.id;

  const comment = await withTransaction(async (session) => {
    const [c] = await CommentModel.create(
      [{ complaintId: complaint._id, authorId: actor.id, body: input.body, isOfficial, isAnonymous }],
      { session },
    );
    await ComplaintModel.updateOne({ _id: complaint._id }, { $inc: { commentCount: 1 } }, { session });
    return c;
  });

  await notifyFollowers(
    complaint._id,
    isOfficial
      ? { type: "OFFICIAL_RESPONSE", title: "Jawaab rasmi ah ayaa la helay", body: complaint.title }
      : { type: "NEW_COMMENT", title: "Faallo cusub", body: complaint.title },
    actor.id,
  );

  const dto: CommentDTO = {
    id: String(comment._id),
    body: comment.body,
    author: isAnonymous ? null : { name: actor.name, role: actor.role },
    isOfficial,
    isAnonymous,
    isOwnComment: true,
    hidden: false,
    createdAt: (comment.createdAt as Date).toISOString(),
  };
  return dto;
}

export async function setCommentHidden(commentId: string, hidden: boolean, actor: Actor, reason = "") {
  if (!can(actor.role, "comment:hide")) throw Errors.forbidden();
  if (!Types.ObjectId.isValid(commentId)) throw Errors.notFound();
  await withTransaction(async (session) => {
    const comment = await CommentModel.findOneAndUpdate(
      { _id: commentId, hiddenAt: hidden ? null : { $ne: null } },
      { $set: hidden ? { hiddenAt: new Date(), hiddenById: actor.id } : { hiddenAt: null, hiddenById: null } },
      { session },
    ).lean();
    if (!comment) return; // already in requested state, or missing
    await ComplaintModel.updateOne(
      { _id: comment.complaintId },
      { $inc: { commentCount: hidden ? -1 : 1 } },
      { session },
    );
    await audit(actor, hidden ? "comment.hide" : "comment.unhide", { type: "Comment", id: commentId }, { reason }, session);
  });
}
