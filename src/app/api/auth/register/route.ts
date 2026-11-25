import { apiRoute, json, parseBody } from "@/server/http/handler";
import { registerSchema } from "@/lib/validation";
import { registerUser } from "@/server/services/auth.service";
import { setSessionCookie } from "@/server/http/cookies";

export const POST = apiRoute(async ({ req, meta }) => {
  const input = await parseBody(req, registerSchema);
  const { user, session } = await registerUser(input, meta);
  const res = json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role, emailVerified: false } }, 201);
  setSessionCookie(res, session);
  return res;
});
