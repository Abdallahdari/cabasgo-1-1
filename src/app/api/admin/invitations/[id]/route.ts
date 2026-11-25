import { apiRoute, json, requirePermission } from "@/server/http/handler";
import { revokeInvitation } from "@/server/services/invitation.service";

export const DELETE = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "invitation:manage");
  await revokeInvitation(ctx.params.id, { ...user, ip: ctx.meta.ip });
  return json({ ok: true });
});
