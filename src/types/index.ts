import type {
  ComplaintStatus,
  NotificationType,
  ReportReason,
  ReportStatus,
  ReportTarget,
  Role,
  UserStatus,
  Visibility,
} from "@/lib/constants";

/** Public identity of a person. Never contains email or other private data. */
export type PublicAuthor = { name: string; role: Role } | null;

export type Ref = { id: string; name: string; slug?: string };

export type ImageDTO = { id: string; url: string; contentType: string };

export type ComplaintDTO = {
  id: string;
  referenceCode: string;
  title: string;
  body: string;
  category: Ref & { color: string; icon: string };
  region: Ref;
  city: Ref;
  district: Ref | null;
  locationDetail: string;
  isAnonymous: boolean;
  /** null when the complaint is anonymous. */
  author: PublicAuthor;
  status: ComplaintStatus;
  visibility: Visibility;
  moderationNote?: string;
  likeCount: number;
  commentCount: number;
  followerCount: number;
  images: ImageDTO[];
  createdAt: string;
  publishedAt: string | null;
  resolvedAt: string | null;
  viewer: { liked: boolean; following: boolean; isOwner: boolean };
};

export type CommentDTO = {
  id: string;
  body: string;
  author: PublicAuthor;
  isOfficial: boolean;
  isAnonymous: boolean;
  isOwnComment: boolean;
  hidden: boolean;
  createdAt: string;
};

export type StatusHistoryDTO = {
  id: string;
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  note: string;
  /** Staff name; history is only ever written by editors/admins. */
  changedBy: string;
  createdAt: string;
};

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  complaintId: string | null;
  read: boolean;
  createdAt: string;
};

export type ReportDTO = {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  complaintId: string;
  complaintTitle: string;
  targetExcerpt: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  createdAt: string;
  resolutionNote: string;
};

export type AdminUserDTO = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type InvitationDTO = {
  id: string;
  email: string;
  invitedBy: string;
  state: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: string;
  createdAt: string;
};

export type AuditLogDTO = {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };

export type CurrentUserDTO = {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
};
