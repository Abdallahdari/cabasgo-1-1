import { apiRoute, json, parseBody, requirePermission } from "@/server/http/handler";
import { categoryInputSchema } from "@/lib/validation";
import { createCategory, listCategories } from "@/server/services/catalog.service";

export const GET = apiRoute(async (ctx) => {
  requirePermission(ctx, "category:manage");
  return json({ categories: await listCategories(true) });
});

export const POST = apiRoute(async (ctx) => {
  const user = requirePermission(ctx, "category:manage");
  const input = await parseBody(ctx.req, categoryInputSchema);
  return json({ id: await createCategory(input, { ...user, ip: ctx.meta.ip }) }, 201);
});
