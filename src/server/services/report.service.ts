import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { withTransaction } from "@/server/db/transaction";
import { CommentModel, ComplaintModel, ContentReportModel } from "@/server/db/models";
import { can } from "@/server/authz/permissions";
import type { SessionUser } from "@/server/auth/session";
import { enforceRateLimit, LIMITS } from "@/server/auth/rate-limit";
import { Errors } from "@/server/http/errors";
import { audit } from "@/server/services/audit.service";
import { loadVisibleComplaint } from "@/server/services/complaint.service";
import type { ReportReason, ReportStatus, ReportTarget } from "@/lib/constants";
import type { Paginated, ReportDTO } from "@/types";

type Actor = SessionUser & { ip?: string };

export async function createReport(
  input: { targetType: ReportTarget; targetId: string; reason: ReportReason; details: string },
  actor: Actor,
) {
  await connectDB();
  await enforceRateLimit(`report:${actor.id}`, LIMITS.reportPerUser.limit, LIMITS.reportPerUser.window);

  let complaintId: Types.ObjectId;
  if (input.targetType === "COMPLAINT") {
    const c = await loadVisibleComplaint(input.targetId, actor);
    if (c.visibility !== "PUBLISHED") throw Errors.notFound();
    complaintId = c._id;
  } else {
    const comment = await CommentModel.findOne({ _id: input.targetId, hiddenAt: null }).lean();
    if (!comment) throw Errors.notFound("Faallada lama helin.");
    const c = await loadVisibleComplaint(String(comment.complaintId), actor);
    complaintId = c._id;
  }

  try {
    await ContentReportModel.create({ ...input, complaintId, reporterId: actor.id });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      throw Errors.conflict("Horay ayaad u soo sheegtay waxyaabahan.");
    }
    throw err;
  }
}

export async function listReports(
  actor: SessionUser,
  status: ReportStatus,
  page: number,
  pageSize: number,
): Promise<Paginated<ReportDTO>> {
  if (!can(actor.role, "report:review")) throw Errors.forbidden();
  await connectDB();
  const filter = { status };
  const [rows, total] = await Promise.all([
    ContentReportModel.find(filter).sort({ createdAt: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    ContentReportModel.countDocuments(filter),
  ]);
  const [complaints, comments] = await Promise.all([
    ComplaintModel.find({ _id: { $in: rows.map((r) => r.complaintId) } }).select("title body").lean(),
    CommentModel.find({ _id: { $in: rows.filter((r) => r.targetType === "COMMENT").map((r) => r.targetId) } })
      .select("body")
      .lean(),
  ]);
  const cMap = new Map(complaints.map((c) => [String(c._id), c]));
  const commentMap = new Map(comments.map((c) => [String(c._id), c]));
  return {
    items: rows.map((r) => {
      const complaint = cMap.get(String(r.complaintId));
      const excerpt =
        r.targetType === "COMMENT" ? commentMap.get(String(r.targetId))?.body : complaint?.body;
      return {
        id: String(r._id),
        targetType: r.targetType as ReportTarget,
        targetId: String(r.targetId),
        complaintId: String(r.complaintId),
        complaintTitle: complaint?.title ?? "(la tirtiray)",
        targetExcerpt: (excerpt ?? "").slice(0, 280),
        reason: r.reason as ReportReason,
        details: r.details ?? "",
        status: r.status as ReportStatus,
        createdAt: (r.createdAt as Date).toISOString(),
        resolutionNote: r.resolutionNote ?? "",
      };
    }),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Resolve or dismiss a report. When `hideContent` is set the reported
 * complaint/comment is hidden in the same transaction, and every other open
 * report on that target is resolved too.
 */
export async function resolveReport(
  reportId: string,
  input: { status: "RESOLVED" | "DISMISSED"; hideContent: boolean; note: string },
  actor: Actor,
) {
  if (!can(actor.role, "report:review")) throw Errors.forbidden();
  await connectDB();
  if (!Types.ObjectId.isValid(reportId)) throw Errors.notFound();

  await withTransaction(async (session) => {
    const report = await ContentReportModel.findOne({ _id: reportId, status: "OPEN" }).session(session ?? null).lean();
    if (!report) throw Errors.conflict("Warbixintan horay ayaa loo xaliyay.");

    const hide = input.status === "RESOLVED" && input.hideContent;
    if (hide && report.targetType === "COMPLAINT") {
      await ComplaintModel.updateOne(
        { _id: report.targetId, visibility: "PUBLISHED" },
        { $set: { visibility: "HIDDEN", moderatedById: actor.id, moderatedAt: new Date(), moderationNote: input.note } },
        { session },
      );
    }
    if (hide && report.targetType === "COMMENT") {
      const res = await CommentModel.updateOne(
        { _id: report.targetId, hiddenAt: null },
        { $set: { hiddenAt: new Date(), hiddenById: actor.id } },
        { session },
      );
      if (res.modifiedCount === 1) {
        await ComplaintModel.updateOne({ _id: report.complaintId }, { $inc: { commentCount: -1 } }, { session });
      }
    }

    const targetFilter = hide
      ? { targetType: report.targetType, targetId: report.targetId, status: "OPEN" as const }
      : { _id: report._id, status: "OPEN" as const };
    await ContentReportModel.updateMany(
      targetFilter,
      { $set: { status: input.status, resolvedById: actor.id, resolvedAt: new Date(), resolutionNote: input.note } },
      { session },
    );
    await audit(
      actor,
      `report.${input.status.toLowerCase()}`,
      { type: "ContentReport", id: reportId },
      { hideContent: hide, targetType: report.targetType, targetId: String(report.targetId) },
      session,
    );
  });
}
