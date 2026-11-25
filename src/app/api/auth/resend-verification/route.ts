import { apiRoute, json, requireUser } from "@/server/http/handler";
import { resendVerification } from "@/server/services/auth.service";

export const POST = apiRoute(async (ctx) => {
  const user = requireUser(ctx);
  const res = await resendVerification(user.id, ctx.meta);
  return json(res);
});
