import { apiRoute, json, parseQuery, requirePermission } from "@/server/http/handler";
import { paginationQuery } from "@/lib/validation";
import { listAuditLogs } from "@/server/services/audit.service";
import { connectDB } from "@/server/db/connect";

export const GET = apiRoute(async (ctx) => {
  requirePermission(ctx, "audit:view");
  const { page, pageSize } = parseQuery(ctx.req, paginationQuery);
  await connectDB();
  return json(await listAuditLogs(page, pageSize));
});
