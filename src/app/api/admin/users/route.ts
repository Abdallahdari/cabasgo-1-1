import { z } from "zod";
import { apiRoute, json, parseQuery, requirePermission } from "@/server/http/handler";
import { paginationQuery } from "@/lib/validation";
import { ROLES } from "@/lib/constants";
import { listUsers } from "@/server/services/user.service";

const query = paginationQuery.extend({ q: z.string().trim().max(100).optional(), role: z.enum(ROLES).optional() });

export const GET = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "user:manage");
  return json(await listUsers(user, parseQuery(ctx.req, query)));
});
