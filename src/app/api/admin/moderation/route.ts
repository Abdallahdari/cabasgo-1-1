import { apiRoute, json, parseQuery, requirePermission } from "@/server/http/handler";
import { paginationQuery } from "@/lib/validation";
import { listModerationQueue } from "@/server/services/complaint.service";

export const GET = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "complaint:moderate");
  const { page, pageSize } = parseQuery(ctx.req, paginationQuery);
  return json(await listModerationQueue(user, page, pageSize));
});
