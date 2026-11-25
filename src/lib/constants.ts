/**
 * Domain constants shared by server and client. Somali labels are the
 * primary UI language.
 */

export const ROLES = ["ADMIN", "EDITOR", "CITIZEN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Maamule",
  EDITOR: "Tifaftire",
  CITIZEN: "Muwaadin",
};

export const USER_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Moderation visibility of a complaint. Only PUBLISHED is publicly visible. */
export const VISIBILITIES = ["PENDING", "PUBLISHED", "REJECTED", "HIDDEN"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PENDING: "Sugaya dib-u-eegis",
  PUBLISHED: "La daabacay",
  REJECTED: "La diiday",
  HIDDEN: "La qariyay",
};

/** Resolution workflow status of a complaint. */
export const COMPLAINT_STATUSES = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: "Furan",
  ACKNOWLEDGED: "La aqoonsaday",
  IN_PROGRESS: "Shaqo socota",
  RESOLVED: "La xaliyay",
  CLOSED: "La xiray",
};

/** Allowed status transitions performed by editors/admins. */
export const STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ["ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"],
  ACKNOWLEDGED: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "CLOSED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED"],
  CLOSED: ["OPEN"],
};

export const REPORT_REASONS = ["SPAM", "ABUSE", "FALSE_INFORMATION", "PRIVACY", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Spam ama xayeysiis",
  ABUSE: "Af-lagaado ama nacayb",
  FALSE_INFORMATION: "Macluumaad been ah",
  PRIVACY: "Xogta gaarka ah ee qof",
  OTHER: "Sabab kale",
};

export const REPORT_STATUSES = ["OPEN", "RESOLVED", "DISMISSED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_TARGETS = ["COMPLAINT", "COMMENT"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const NOTIFICATION_TYPES = [
  "COMPLAINT_PUBLISHED",
  "COMPLAINT_REJECTED",
  "COMPLAINT_HIDDEN",
  "STATUS_CHANGED",
  "NEW_COMMENT",
  "OFFICIAL_RESPONSE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const UPLOAD_LIMITS = {
  maxImagesPerComplaint: 5,
  maxImageBytes: 5 * 1024 * 1024,
  allowedContentTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  allowedExtensions: ["jpg", "jpeg", "png", "webp"] as const,
};
export type AllowedImageType = (typeof UPLOAD_LIMITS.allowedContentTypes)[number];

export const PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export const CATEGORY_ICONS = [
  "droplets",
  "zap",
  "construction",
  "trash",
  "stethoscope",
  "graduation-cap",
  "shield",
  "scale",
  "landmark",
  "trees",
  "bus",
  "circle-help",
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];
