import { apiRoute, json, parseBody } from "@/server/http/handler";
import { loginSchema } from "@/lib/validation";
import { loginUser } from "@/server/services/auth.service";
import { setSessionCookie } from "@/server/http/cookies";

export const POST = apiRoute(async ({ req, meta }) => {
  const input = await parseBody(req, loginSchema);
  const { user, session } = await loginUser(input, meta);
  const res = json({
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role, emailVerified: Boolean(user.emailVerifiedAt) },
  });
  setSessionCookie(res, session);
  return res;
});
