import { apiRoute, json, parseBody, requirePermission } from "@/server/http/handler";
import { categoryInputSchema } from "@/lib/validation";
import { updateCategory } from "@/server/services/catalog.service";

export const PATCH = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "category:manage");
  const input = await parseBody(ctx.req, categoryInputSchema.partial());
  await updateCategory(ctx.params.id, input, { ...user, ip: ctx.meta.ip });
  return json({ ok: true });
});
