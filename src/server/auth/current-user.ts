import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName, validateSessionToken, type SessionUser } from "@/server/auth/session";
import { can, type Permission } from "@/server/authz/permissions";

/**
 * Data Access Layer entry point for Server Components. Deduplicated per
 * request with React `cache`.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  return validateSessionToken(store.get(sessionCookieName())?.value);
});

export async function requirePageUser(nextPath = "/"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requirePagePermission(permission: Permission, nextPath = "/"): Promise<SessionUser> {
  const user = await requirePageUser(nextPath);
  if (!can(user.role, permission)) redirect("/?error=forbidden");
  return user;
}
