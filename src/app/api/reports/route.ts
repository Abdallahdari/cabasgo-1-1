import { apiRoute, json, parseBody, requirePermission } from "@/server/http/handler";
import { createReportSchema } from "@/lib/validation";
import { createReport } from "@/server/services/report.service";

export const POST = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "complaint:engage");
  const input = await parseBody(ctx.req, createReportSchema);
  await createReport(input, { ...user, ip: ctx.meta.ip });
  return json({ ok: true }, 201);
});
