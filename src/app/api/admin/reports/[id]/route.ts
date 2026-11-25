import { apiRoute, json, parseBody, requirePermission } from "@/server/http/handler";
import { resolveReportSchema } from "@/lib/validation";
import { resolveReport } from "@/server/services/report.service";

export const PATCH = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "report:review");
  const input = await parseBody(ctx.req, resolveReportSchema);
  await resolveReport(ctx.params.id, input, { ...user, ip: ctx.meta.ip });
  return json({ ok: true });
});
