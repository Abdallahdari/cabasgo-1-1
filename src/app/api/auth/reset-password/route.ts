import { apiRoute, json, parseBody } from "@/server/http/handler";
import { resetPasswordSchema } from "@/lib/validation";
import { resetPassword } from "@/server/services/auth.service";
import { clearSessionCookie } from "@/server/http/cookies";

export const POST = apiRoute(async ({ req }) => {
  const { token, password } = await parseBody(req, resetPasswordSchema);
  await resetPassword(token, password);
  const res = json({ ok: true });
  clearSessionCookie(res);
  return res;
});
