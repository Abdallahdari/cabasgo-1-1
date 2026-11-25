import { Schema, type InferSchemaType } from "mongoose";
import { COMPLAINT_STATUSES, UPLOAD_LIMITS, VISIBILITIES } from "@/lib/constants";
import { defineModel, ObjectId } from "./_util";

const complaintSchema = new Schema(
  {
    /** Human-friendly tracking code, e.g. CB-7K2M9QXA. */
    referenceCode: { type: String, required: true, match: /^CB-[A-Z0-9]{8}$/ },
    title: { type: String, required: true, trim: true, minlength: 8, maxlength: 140 },
    body: { type: String, required: true, trim: true, minlength: 20, maxlength: 5000 },
    categoryId: { type: ObjectId, ref: "Category", required: true },
    regionId: { type: ObjectId, ref: "Region", required: true },
    cityId: { type: ObjectId, ref: "City", required: true },
    districtId: { type: ObjectId, ref: "District", default: null },
    locationDetail: { type: String, trim: true, maxlength: 200, default: "" },

    /**
     * Owner. Always stored (needed for ownership checks, edits and
     * notifications) but NEVER included in any public response when
     * `isAnonymous` is true. See toPublicComplaint().
     */
    authorId: { type: ObjectId, ref: "User", required: true },
    isAnonymous: { type: Boolean, required: true, default: false },

    visibility: { type: String, enum: VISIBILITIES, required: true, default: "PENDING" },
    status: { type: String, enum: COMPLAINT_STATUSES, required: true, default: "OPEN" },

    moderatedById: { type: ObjectId, ref: "User", default: null },
    moderatedAt: { type: Date, default: null },
    moderationNote: { type: String, trim: true, maxlength: 500, default: "" },
    publishedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },

    // Denormalised counters, updated atomically together with the source rows.
    likeCount: { type: Number, default: 0, min: 0 },
    commentCount: { type: Number, default: 0, min: 0 },
    followerCount: { type: Number, default: 0, min: 0 },
    /** Images reserved or attached (pending uploads count against the limit). */
    imageCount: { type: Number, default: 0, min: 0, max: UPLOAD_LIMITS.maxImagesPerComplaint },
  },
  { timestamps: true, optimisticConcurrency: true },
);

complaintSchema.index({ referenceCode: 1 }, { unique: true });
complaintSchema.index({ visibility: 1, publishedAt: -1 });
complaintSchema.index({ visibility: 1, likeCount: -1, publishedAt: -1 });
complaintSchema.index({ visibility: 1, status: 1, publishedAt: -1 });
complaintSchema.index({ visibility: 1, categoryId: 1, publishedAt: -1 });
complaintSchema.index({ visibility: 1, regionId: 1, publishedAt: -1 });
complaintSchema.index({ visibility: 1, createdAt: 1 }); // moderation queue
complaintSchema.index({ authorId: 1, createdAt: -1 });
complaintSchema.index(
  { title: "text", body: "text", locationDetail: "text" },
  { weights: { title: 5, locationDetail: 2, body: 1 }, default_language: "none", name: "complaint_text" },
);

export type ComplaintDoc = InferSchemaType<typeof complaintSchema>;
export const ComplaintModel = defineModel<ComplaintDoc>("Complaint", complaintSchema);

// ---------------------------------------------------------------------------

export const IMAGE_STATUSES = ["PENDING", "ATTACHED"] as const;

const complaintImageSchema = new Schema(
  {
    complaintId: { type: ObjectId, ref: "Complaint", required: true },
    uploaderId: { type: ObjectId, ref: "User", required: true },
    /** S3 object key, e.g. complaints/<complaintId>/<uuid>.webp */
    key: { type: String, required: true, maxlength: 300 },
    contentType: { type: String, enum: UPLOAD_LIMITS.allowedContentTypes, required: true },
    /** Size declared by the client before upload; verified on confirm. */
    size: { type: Number, required: true, min: 1, max: UPLOAD_LIMITS.maxImageBytes },
    status: { type: String, enum: IMAGE_STATUSES, required: true, default: "PENDING" },
    order: { type: Number, default: 0 },
    confirmedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
complaintImageSchema.index({ key: 1 }, { unique: true });
complaintImageSchema.index({ complaintId: 1, status: 1, order: 1 });
complaintImageSchema.index({ status: 1, createdAt: 1 }); // orphan cleanup

export type ComplaintImageDoc = InferSchemaType<typeof complaintImageSchema>;
export const ComplaintImageModel = defineModel<ComplaintImageDoc>("ComplaintImage", complaintImageSchema);

// ---------------------------------------------------------------------------

const complaintLikeSchema = new Schema(
  {
    complaintId: { type: ObjectId, ref: "Complaint", required: true },
    userId: { type: ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
complaintLikeSchema.index({ complaintId: 1, userId: 1 }, { unique: true });
complaintLikeSchema.index({ userId: 1, createdAt: -1 });

export const ComplaintLikeModel = defineModel<InferSchemaType<typeof complaintLikeSchema>>(
  "ComplaintLike",
  complaintLikeSchema,
);

// ---------------------------------------------------------------------------

const complaintFollowerSchema = new Schema(
  {
    complaintId: { type: ObjectId, ref: "Complaint", required: true },
    userId: { type: ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
complaintFollowerSchema.index({ complaintId: 1, userId: 1 }, { unique: true });
complaintFollowerSchema.index({ userId: 1, createdAt: -1 });

export const ComplaintFollowerModel = defineModel<InferSchemaType<typeof complaintFollowerSchema>>(
  "ComplaintFollower",
  complaintFollowerSchema,
);

// ---------------------------------------------------------------------------

const statusHistorySchema = new Schema(
  {
    complaintId: { type: ObjectId, ref: "Complaint", required: true },
    fromStatus: { type: String, enum: [...COMPLAINT_STATUSES, null], default: null },
    toStatus: { type: String, enum: COMPLAINT_STATUSES, required: true },
    changedById: { type: ObjectId, ref: "User", required: true },
    /** Public note shown in the complaint timeline. */
    note: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
statusHistorySchema.index({ complaintId: 1, createdAt: 1 });

export const ComplaintStatusHistoryModel = defineModel<InferSchemaType<typeof statusHistorySchema>>(
  "ComplaintStatusHistory",
  statusHistorySchema,
);
