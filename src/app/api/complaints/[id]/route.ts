import { apiRoute, json, parseBody, requireUser } from "@/server/http/handler";
import { updateComplaintSchema } from "@/lib/validation";
import { deleteComplaint, getComplaint, updateComplaint } from "@/server/services/complaint.service";

export const GET = apiRoute(async (ctx) => json({ complaint: await getComplaint(ctx.params.id, ctx.user) }));

export const PATCH = apiRoute(async (ctx) => {
  const user = requireUser(ctx);
  const input = await parseBody(ctx.req, updateComplaintSchema);
  return json({ complaint: await updateComplaint(ctx.params.id, input, { ...user, ip: ctx.meta.ip }) });
});

export const DELETE = apiRoute(async (ctx) => {
  const user = requireUser(ctx);
  await deleteComplaint(ctx.params.id, { ...user, ip: ctx.meta.ip });
  return json({ ok: true });
});
