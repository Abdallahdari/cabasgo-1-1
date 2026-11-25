import { apiRoute, json, parseBody, requirePermission } from "@/server/http/handler";
import { adminUpdateUserSchema } from "@/lib/validation";
import { adminUpdateUser } from "@/server/services/user.service";

export const PATCH = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "user:manage");
  const input = await parseBody(ctx.req, adminUpdateUserSchema);
  await adminUpdateUser(ctx.params.id, input, { ...user, ip: ctx.meta.ip });
  return json({ ok: true });
});
