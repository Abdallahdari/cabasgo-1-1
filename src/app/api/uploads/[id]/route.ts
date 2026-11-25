import { apiRoute, json, requireUser } from "@/server/http/handler";
import { deleteImage } from "@/server/services/upload.service";

export const DELETE = apiRoute(async (ctx) => {
  const user = requireUser(ctx);
  await deleteImage(ctx.params.id, user);
  return json({ ok: true });
});
