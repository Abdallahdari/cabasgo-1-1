import { apiRoute, json, parseBody } from "@/server/http/handler";
import { emailOnlySchema } from "@/lib/validation";
import { requestPasswordReset } from "@/server/services/auth.service";

/** Always 200 with the same body, whether or not the account exists. */
export const POST = apiRoute(async ({ req, meta }) => {
  const { email } = await parseBody(req, emailOnlySchema);
  await requestPasswordReset(email, meta);
  return json({ ok: true });
});
