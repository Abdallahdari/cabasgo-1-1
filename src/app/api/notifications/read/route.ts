import { z } from "zod";
import { apiRoute, json, parseBody, requireUser } from "@/server/http/handler";
import { objectId } from "@/lib/validation";
import { markNotificationsRead } from "@/server/services/notification.service";

const schema = z.object({ ids: z.array(objectId).max(100).optional() });

export const POST = apiRoute(async (ctx) => {
  const user = requireUser(ctx);
  const { ids } = await parseBody(ctx.req, schema);
  return json({ updated: await markNotificationsRead(user.id, ids) });
});
