import { apiRoute, json, requireUser } from "@/server/http/handler";
import { revokeAllSessions } from "@/server/auth/session";
import { clearSessionCookie } from "@/server/http/cookies";

export const POST = apiRoute(async (ctx) => {
  const user = requireUser(ctx);
  await revokeAllSessions(user.id);
  const res = json({ ok: true });
  clearSessionCookie(res);
  return res;
});
