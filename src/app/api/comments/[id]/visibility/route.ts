import { z } from "zod";
import { apiRoute, json, parseBody, requirePermission } from "@/server/http/handler";
import { setCommentHidden } from "@/server/services/comment.service";

const schema = z.object({ hidden: z.boolean(), reason: z.string().trim().max(500).optional().default("") });

export const POST = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "comment:hide");
  const { hidden, reason } = await parseBody(ctx.req, schema);
  await setCommentHidden(ctx.params.id, hidden, { ...user, ip: ctx.meta.ip }, reason);
  return json({ ok: true });
});
