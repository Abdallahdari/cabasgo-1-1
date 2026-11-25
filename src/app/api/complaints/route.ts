import { apiRoute, json, parseBody, parseQuery, requirePermission, requireVerifiedUser } from "@/server/http/handler";
import { createComplaintSchema, listComplaintsQuery } from "@/lib/validation";
import { createComplaint, listPublicComplaints } from "@/server/services/complaint.service";

/** Public feed: only PUBLISHED complaints; anonymous authors are redacted. */
export const GET = apiRoute(async (ctx) => {
  const query = parseQuery(ctx.req, listComplaintsQuery);
  return json(await listPublicComplaints(query, ctx.user));
});

export const POST = apiRoute(async (ctx) => {
  requirePermission(ctx, "complaint:create");
  const user = requireVerifiedUser(ctx);
  const input = await parseBody(ctx.req, createComplaintSchema);
  const complaint = await createComplaint(input, { ...user, ip: ctx.meta.ip });
  return json({ complaint }, 201);
});
