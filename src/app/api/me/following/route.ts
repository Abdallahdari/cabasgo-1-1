import { apiRoute, json, parseQuery, requireUser } from "@/server/http/handler";
import { paginationQuery } from "@/lib/validation";
import { listFollowedComplaints } from "@/server/services/complaint.service";

export const GET = apiRoute(async (ctx) => {
  const user = requireUser(ctx);
  const { page, pageSize } = parseQuery(ctx.req, paginationQuery);
  return json(await listFollowedComplaints(user, page, pageSize));
});
