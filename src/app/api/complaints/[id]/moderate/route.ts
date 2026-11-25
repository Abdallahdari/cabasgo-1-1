import { apiRoute, json, parseBody, requirePermission } from "@/server/http/handler";
import { moderateComplaintSchema } from "@/lib/validation";
import { moderateComplaint } from "@/server/services/complaint.service";

export const POST = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "complaint:moderate");
  const input = await parseBody(ctx.req, moderateComplaintSchema);
  return json({ complaint: await moderateComplaint(ctx.params.id, input, { ...user, ip: ctx.meta.ip }) });
});
