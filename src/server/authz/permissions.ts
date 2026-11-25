import type { Role } from "@/lib/constants";
import { Errors } from "@/server/http/errors";

/**
 * Central permission table for the three-role model.
 * Server code must call `assertCan` (or `requireRole`) before privileged
 * work; UI checks are cosmetic only.
 */
export const PERMISSIONS = {
  "complaint:create": ["CITIZEN", "EDITOR", "ADMIN"],
  "complaint:engage": ["CITIZEN", "EDITOR", "ADMIN"], // like, follow, comment, report
  "complaint:moderate": ["EDITOR", "ADMIN"], // approve / reject / hide / restore
  "complaint:change-status": ["EDITOR", "ADMIN"],
  "complaint:view-unpublished": ["EDITOR", "ADMIN"],
  "comment:official": ["EDITOR", "ADMIN"],
  "comment:hide": ["EDITOR", "ADMIN"],
  "report:review": ["EDITOR", "ADMIN"],
  "user:manage": ["ADMIN"],
  "invitation:manage": ["ADMIN"],
  "category:manage": ["ADMIN"],
  "audit:view": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export function assertCan(role: Role | null | undefined, permission: Permission) {
  if (!can(role, permission)) throw Errors.forbidden();
}

export function isStaff(role: Role | null | undefined) {
  return role === "EDITOR" || role === "ADMIN";
}
