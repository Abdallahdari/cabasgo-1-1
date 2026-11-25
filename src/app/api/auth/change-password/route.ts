import { apiRoute, json, parseBody, requireUser } from "@/server/http/handler";
import { changePasswordSchema } from "@/lib/validation";
import { changePassword } from "@/server/services/auth.service";

export const POST = apiRoute(async (ctx) => {
  const user = requireUser(ctx);
  const { currentPassword, newPassword } = await parseBody(ctx.req, changePasswordSchema);
  await changePassword(user.id, user.sessionId, currentPassword, newPassword);
  return json({ ok: true });
});
