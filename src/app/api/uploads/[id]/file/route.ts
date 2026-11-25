import { apiRoute, json, requireVerifiedUser } from "@/server/http/handler";
import { Errors } from "@/server/http/errors";
import { receiveUploadedFile } from "@/server/services/upload.service";
import { UPLOAD_LIMITS } from "@/lib/constants";

/**
 * Local-development upload target (STORAGE_DRIVER=mongodb). Plays the role of
 * the S3 presigned POST: accepts multipart form data with a single `file`.
 */
export const POST = apiRoute(async (ctx) => {
  const user = requireVerifiedUser(ctx);
  const length = Number(ctx.req.headers.get("content-length") ?? 0);
  if (length > UPLOAD_LIMITS.maxImageBytes + 64 * 1024) throw Errors.badRequest("Sawirku waa inuusan ka badnaan 5 MB.");
  const form = await ctx.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw Errors.badRequest("Fayl lama soo dirin.");
  await receiveUploadedFile(ctx.params.id, user, file);
  return json({ ok: true }, 201);
});
