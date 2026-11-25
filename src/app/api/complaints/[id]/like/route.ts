import { apiRoute, json, requirePermission } from "@/server/http/handler";
import { setLike } from "@/server/services/complaint.service";

export const PUT = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "complaint:engage");
  return json(await setLike(ctx.params.id, user, true));
});

export const DELETE = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "complaint:engage");
  return json(await setLike(ctx.params.id, user, false));
});
