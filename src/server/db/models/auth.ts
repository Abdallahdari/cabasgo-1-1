import { Schema, type InferSchemaType } from "mongoose";
import { defineModel, ObjectId } from "./_util";

/**
 * Server-side session. The cookie holds a random 256-bit token; only its
 * SHA-256 hash is stored, so a database leak does not leak live sessions.
 * Expired sessions are removed automatically by the TTL index.
 */
const sessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    userId: { type: ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, default: () => new Date() },
    ip: { type: String, maxlength: 64, default: null },
    userAgent: { type: String, maxlength: 300, default: null },
  },
  { timestamps: true },
);
sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof sessionSchema>;
export const SessionModel = defineModel<SessionDoc>("Session", sessionSchema);

/** Single-use tokens for email verification and password reset (hash only). */
export const AUTH_TOKEN_TYPES = ["EMAIL_VERIFICATION", "PASSWORD_RESET"] as const;
export type AuthTokenType = (typeof AUTH_TOKEN_TYPES)[number];

const authTokenSchema = new Schema(
  {
    type: { type: String, enum: AUTH_TOKEN_TYPES, required: true },
    tokenHash: { type: String, required: true },
    userId: { type: ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
authTokenSchema.index({ tokenHash: 1 }, { unique: true });
authTokenSchema.index({ userId: 1, type: 1 });
// Keep used/expired tokens for a day for diagnostics, then purge.
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86_400 });

export const AuthTokenModel = defineModel<InferSchemaType<typeof authTokenSchema>>("AuthToken", authTokenSchema);

/** Fixed-window rate limit counters shared by all app containers. */
const rateLimitSchema = new Schema({
  key: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});
rateLimitSchema.index({ key: 1 }, { unique: true });
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitModel = defineModel<InferSchemaType<typeof rateLimitSchema>>("RateLimit", rateLimitSchema);
