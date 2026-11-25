import { apiRoute, json, requireVerifiedUser } from "@/server/http/handler";
import { confirmImageUpload } from "@/server/services/upload.service";

export const POST = apiRoute(async (ctx) => {
  const user = requireVerifiedUser(ctx);
  return json({ image: await confirmImageUpload(ctx.params.id, user) });
});
