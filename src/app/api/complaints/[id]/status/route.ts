import { apiRoute, json, parseBody, requirePermission } from "@/server/http/handler";
import { changeStatusSchema } from "@/lib/validation";
import { changeComplaintStatus } from "@/server/services/complaint.service";

export const POST = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "complaint:change-status");
  const input = await parseBody(ctx.req, changeStatusSchema);
  return json({ complaint: await changeComplaintStatus(ctx.params.id, input, { ...user, ip: ctx.meta.ip }) });
});
