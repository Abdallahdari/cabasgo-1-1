import { apiRoute, json, parseBody, requireUser } from "@/server/http/handler";
import { updateProfileSchema } from "@/lib/validation";
import { getOwnProfile, updateOwnProfile } from "@/server/services/user.service";

export const GET = apiRoute(async (ctx) => json({ profile: await getOwnProfile(requireUser(ctx).id) }));

export const PATCH = apiRoute(async (ctx) => {
  const user = requireUser(ctx);
  // Strict schema: `role`, `status`, `email` etc. are rejected with 400.
  const input = await parseBody(ctx.req, updateProfileSchema);
  await updateOwnProfile(user, input);
  return json({ profile: await getOwnProfile(user.id) });
});
