import { z } from "zod";
import {
  CATEGORY_ICONS,
  COMPLAINT_STATUSES,
  MAX_PAGE_SIZE,
  PAGE_SIZE,
  REPORT_REASONS,
  REPORT_TARGETS,
  UPLOAD_LIMITS,
} from "@/lib/constants";

/** 24-hex MongoDB ObjectId string. */
export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Aqoonsi aan sax ahayn.");

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Fadlan geli email sax ah."));

/** At least 10 chars, with a letter and a digit. Long passphrases are encouraged. */
export const password = z
  .string()
  .min(10, "Furaha sirta ah waa inuu ahaadaa ugu yaraan 10 xaraf.")
  .max(128, "Furaha sirta ah aad buu u dheer yahay.")
  .regex(/[A-Za-z]/, "Furaha sirta ah waa inuu leeyahay xaraf.")
  .regex(/[0-9]/, "Furaha sirta ah waa inuu leeyahay lambar.");

const name = z.string().trim().min(2, "Magaca waa inuu ahaadaa ugu yaraan 2 xaraf.").max(80);

// ---------------------------------------------------------------------------
// Auth

export const registerSchema = z.object({
  name,
  email,
  password,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Geli furaha sirta ah.").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const emailOnlySchema = z.object({ email });

/** Raw single-use tokens are 43-char base64url strings (32 random bytes). */
export const tokenString = z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Xiriirka ma saxna.");

export const verifyEmailSchema = z.object({ token: tokenString });

export const resetPasswordSchema = z.object({
  token: tokenString,
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

export const updateProfileSchema = z
  .object({
    name: name.optional(),
    regionId: objectId.nullable().optional(),
    notifyByEmail: z.boolean().optional(),
  })
  .strict(); // rejects unknown keys such as `role`

export const acceptInvitationSchema = z.object({
  token: tokenString,
  // Required only when the invited email has no account yet.
  name: name.optional(),
  password: password.optional(),
});

// ---------------------------------------------------------------------------
// Complaints

export const createComplaintSchema = z
  .object({
    title: z.string().trim().min(8, "Cinwaanka waa inuu ahaadaa ugu yaraan 8 xaraf.").max(140),
    body: z.string().trim().min(20, "Faahfaahinta waa inay ahaataa ugu yaraan 20 xaraf.").max(5000),
    categoryId: objectId,
    regionId: objectId,
    cityId: objectId,
    districtId: objectId.nullable().optional(),
    locationDetail: z.string().trim().max(200).optional().default(""),
    isAnonymous: z.boolean().default(false),
  })
  .strict();
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const updateComplaintSchema = createComplaintSchema.partial().strict();

export const listComplaintsQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(PAGE_SIZE),
  sort: z.enum(["new", "top"]).default("new"),
  status: z.enum(COMPLAINT_STATUSES).optional(),
  categoryId: objectId.optional(),
  regionId: objectId.optional(),
  cityId: objectId.optional(),
  districtId: objectId.optional(),
  q: z.string().trim().max(100).optional(),
});
export type ListComplaintsQuery = z.infer<typeof listComplaintsQuery>;

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(PAGE_SIZE),
});

export const changeStatusSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES),
  note: z.string().trim().max(1000).optional().default(""),
});

export const moderateComplaintSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("APPROVE"), note: z.string().trim().max(500).optional().default("") }),
  z.object({
    action: z.literal("REJECT"),
    note: z.string().trim().min(5, "Fadlan qor sababta loo diiday.").max(500),
  }),
  z.object({
    action: z.literal("HIDE"),
    note: z.string().trim().min(5, "Fadlan qor sababta loo qariyay.").max(500),
  }),
  z.object({ action: z.literal("RESTORE"), note: z.string().trim().max(500).optional().default("") }),
]);
export type ModerateComplaintInput = z.infer<typeof moderateComplaintSchema>;

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Faallo madhan lama diri karo.").max(2000),
  /** Only honoured for editors/admins. */
  official: z.boolean().optional().default(false),
});

// ---------------------------------------------------------------------------
// Uploads

export const presignUploadSchema = z.object({
  complaintId: objectId,
  contentType: z.enum(UPLOAD_LIMITS.allowedContentTypes, "Nooca faylka lama oggola. Isticmaal JPG, PNG ama WebP."),
  size: z
    .number()
    .int()
    .min(1)
    .max(UPLOAD_LIMITS.maxImageBytes, "Sawirku waa inuusan ka badnaan 5 MB."),
  fileName: z
    .string()
    .trim()
    .max(200)
    .refine(
      (n) => (UPLOAD_LIMITS.allowedExtensions as readonly string[]).includes(n.split(".").pop()?.toLowerCase() ?? ""),
      "Kordhinta faylka lama oggola.",
    ),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

// ---------------------------------------------------------------------------
// Reports & admin

export const createReportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: objectId,
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional().default(""),
});

export const resolveReportSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
  /** When resolving, optionally hide the reported content. */
  hideContent: z.boolean().optional().default(false),
  note: z.string().trim().max(500).optional().default(""),
});

export const createInvitationSchema = z.object({ email });

export const adminUpdateUserSchema = z
  .object({
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
    /** Admins may only move users between CITIZEN and EDITOR. ADMIN is never assignable via API. */
    role: z.enum(["CITIZEN", "EDITOR"]).optional(),
  })
  .strict()
  .refine((v) => v.status !== undefined || v.role !== undefined, "Wax isbeddel ah lama soo dirin.");

export const categoryInputSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Slug-ga waa xarfo yaryar, lambarro iyo '-'.").max(60),
    description: z.string().trim().max(300).optional().default(""),
    icon: z.enum(CATEGORY_ICONS).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    order: z.number().int().min(0).max(1000).optional(),
    active: z.boolean().optional(),
  })
  .strict();

/**
 * Normalize a post-auth `next` redirect target to a safe same-site relative
 * path. Absolute URLs, protocol-relative (`//host`), and backslash tricks are
 * dropped to `/`, preventing open redirects and keeping attacker-controlled
 * strings out of the page entirely.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next.slice(0, 512);
}
