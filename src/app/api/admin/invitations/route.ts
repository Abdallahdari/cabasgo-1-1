import { apiRoute, json, parseBody, parseQuery, requirePermission } from "@/server/http/handler";
import { createInvitationSchema, paginationQuery } from "@/lib/validation";
import { createInvitation, listInvitations } from "@/server/services/invitation.service";

export const GET = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "invitation:manage");
  const { page, pageSize } = parseQuery(ctx.req, paginationQuery);
  return json(await listInvitations(user, page, pageSize));
});

/** Only administrators can invite editors. */
export const POST = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "invitation:manage");
  const { email } = await parseBody(ctx.req, createInvitationSchema);
  return json({ invitation: await createInvitation(email, { ...user, ip: ctx.meta.ip }) }, 201);
});
