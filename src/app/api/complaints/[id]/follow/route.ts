import { apiRoute, json, requirePermission } from "@/server/http/handler";
import { setFollow } from "@/server/services/complaint.service";

export const PUT = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "complaint:engage");
  return json(await setFollow(ctx.params.id, user, true));
});

export const DELETE = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "complaint:engage");
  return json(await setFollow(ctx.params.id, user, false));
});
