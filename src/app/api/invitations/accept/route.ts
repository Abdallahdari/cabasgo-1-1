import { apiRoute, json, parseBody } from "@/server/http/handler";
import { acceptInvitationSchema } from "@/lib/validation";
import { acceptInvitation } from "@/server/services/invitation.service";
import { setSessionCookie } from "@/server/http/cookies";

export const POST = apiRoute(async (ctx) => {
  const input = await parseBody(ctx.req, acceptInvitationSchema);
  const result = await acceptInvitation(input, ctx.user, ctx.meta);
  const res = json({ ok: true });
  if (result.session) setSessionCookie(res, result.session);
  return res;
});
