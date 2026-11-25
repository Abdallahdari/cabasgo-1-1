import { Schema, type InferSchemaType } from "mongoose";
import { NOTIFICATION_TYPES, REPORT_REASONS, REPORT_STATUSES, REPORT_TARGETS } from "@/lib/constants";
import { defineModel, ObjectId } from "./_util";

const commentSchema = new Schema(
  {
    complaintId: { type: ObjectId, ref: "Complaint", required: true },
    authorId: { type: ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
    /** Official response from an editor/admin, highlighted in the UI. */
    isOfficial: { type: Boolean, default: false },
    /**
     * Shown without the author's identity. Forced to true when the anonymous
     * owner of a complaint comments on it, so the comment cannot de-anonymise them.
     */
    isAnonymous: { type: Boolean, default: false },
    hiddenAt: { type: Date, default: null },
    hiddenById: { type: ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
commentSchema.index({ complaintId: 1, hiddenAt: 1, createdAt: 1 });
commentSchema.index({ authorId: 1, createdAt: -1 });

export type CommentDoc = InferSchemaType<typeof commentSchema>;
export const CommentModel = defineModel<CommentDoc>("Comment", commentSchema);

// ---------------------------------------------------------------------------

const notificationSchema = new Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    complaintId: { type: ObjectId, ref: "Complaint", default: null },
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, default: "", maxlength: 500 },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });
// Purge notifications after 180 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = defineModel<NotificationDoc>("Notification", notificationSchema);

// ---------------------------------------------------------------------------

const contentReportSchema = new Schema(
  {
    reporterId: { type: ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: REPORT_TARGETS, required: true },
    targetId: { type: ObjectId, required: true },
    complaintId: { type: ObjectId, ref: "Complaint", required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: REPORT_STATUSES, default: "OPEN" },
    resolvedById: { type: ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    resolutionNote: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);
// One report per user per target.
contentReportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });
contentReportSchema.index({ status: 1, createdAt: 1 });
contentReportSchema.index({ targetType: 1, targetId: 1 });

export type ContentReportDoc = InferSchemaType<typeof contentReportSchema>;
export const ContentReportModel = defineModel<ContentReportDoc>("ContentReport", contentReportSchema);
