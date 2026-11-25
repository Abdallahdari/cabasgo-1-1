import { apiRoute, json, parseBody } from "@/server/http/handler";
import { verifyEmailSchema } from "@/lib/validation";
import { verifyEmail } from "@/server/services/auth.service";

export const POST = apiRoute(async ({ req }) => {
  const { token } = await parseBody(req, verifyEmailSchema);
  await verifyEmail(token);
  return json({ ok: true });
});
