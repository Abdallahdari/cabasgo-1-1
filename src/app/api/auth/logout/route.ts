import { apiRoute, json } from "@/server/http/handler";
import { revokeSessionToken, sessionCookieName } from "@/server/auth/session";
import { clearSessionCookie } from "@/server/http/cookies";

export const POST = apiRoute(async ({ req }) => {
  await revokeSessionToken(req.cookies.get(sessionCookieName())?.value);
  const res = json({ ok: true });
  clearSessionCookie(res);
  return res;
});
