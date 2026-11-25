import { z } from "zod";
import { apiRoute, json, parseQuery, requirePermission } from "@/server/http/handler";
import { paginationQuery } from "@/lib/validation";
import { REPORT_STATUSES } from "@/lib/constants";
import { listReports } from "@/server/services/report.service";

const query = paginationQuery.extend({ status: z.enum(REPORT_STATUSES).default("OPEN") });

export const GET = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "report:review");
  const { page, pageSize, status } = parseQuery(ctx.req, query);
  return json(await listReports(user, status, page, pageSize));
});
