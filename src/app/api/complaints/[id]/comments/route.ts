import { apiRoute, json, parseBody, parseQuery, requirePermission, requireVerifiedUser } from "@/server/http/handler";
import { createCommentSchema, paginationQuery } from "@/lib/validation";
import { createComment, listComments } from "@/server/services/comment.service";

export const GET = apiRoute(async (ctx) => {
  const { page, pageSize } = parseQuery(ctx.req, paginationQuery);
  return json(await listComments(ctx.params.id, ctx.user, page, pageSize));
});

export const POST = apiRoute(async (ctx) => {
  requirePermission(ctx, "complaint:engage");
  const user = requireVerifiedUser(ctx);
  const input = await parseBody(ctx.req, createCommentSchema);
  return json({ comment: await createComment(ctx.params.id, input, { ...user, ip: ctx.meta.ip }) }, 201);
});
