import { Schema, type InferSchemaType } from "mongoose";
import { defineModel, ObjectId } from "./_util";

/**
 * Editor invitation. The raw token is sent by email only; the database keeps
 * a SHA-256 hash. Invitations expire and are consumed atomically (single use).
 */
const editorInvitationSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    tokenHash: { type: String, required: true },
    invitedById: { type: ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    acceptedById: { type: ObjectId, ref: "User", default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
editorInvitationSchema.index({ tokenHash: 1 }, { unique: true });
editorInvitationSchema.index({ email: 1, createdAt: -1 });
editorInvitationSchema.index({ createdAt: -1 });

export type EditorInvitationDoc = InferSchemaType<typeof editorInvitationSchema>;
export const EditorInvitationModel = defineModel<EditorInvitationDoc>("EditorInvitation", editorInvitationSchema);

// ---------------------------------------------------------------------------

/** Append-only audit trail of privileged actions. */
const adminAuditLogSchema = new Schema(
  {
    actorId: { type: ObjectId, ref: "User", required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, maxlength: 80 },
    targetType: { type: String, required: true, maxlength: 40 },
    targetId: { type: String, default: null, maxlength: 64 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null, maxlength: 64 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ actorId: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

function immutable() {
  throw new Error("AdminAuditLog is append-only");
}
for (const op of [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "findOneAndReplace",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const) {
  adminAuditLogSchema.pre(op, immutable);
}

export type AdminAuditLogDoc = InferSchemaType<typeof adminAuditLogSchema>;
export const AdminAuditLogModel = defineModel<AdminAuditLogDoc>("AdminAuditLog", adminAuditLogSchema);
