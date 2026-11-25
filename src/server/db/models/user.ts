import { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";
import { ROLES, USER_STATUSES } from "@/lib/constants";
import { defineModel, ObjectId } from "./_util";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    // Never selected by default; only the auth service reads it explicitly.
    passwordHash: { type: String, required: true, select: false },
    // Assigned by the server only (registration = CITIZEN, invitation = EDITOR,
    // bootstrap script = ADMIN). Never taken from client input.
    role: { type: String, enum: ROLES, required: true, default: "CITIZEN" },
    status: { type: String, enum: USER_STATUSES, required: true, default: "ACTIVE" },
    emailVerifiedAt: { type: Date, default: null },
    regionId: { type: ObjectId, ref: "Region", default: null },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    notifyByEmail: { type: Boolean, default: true },
  },
  { timestamps: true, optimisticConcurrency: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ status: 1 });

export type UserDoc = InferSchemaType<typeof userSchema>;
export type User = HydratedDocument<UserDoc>;
export const UserModel = defineModel<UserDoc>("User", userSchema);
