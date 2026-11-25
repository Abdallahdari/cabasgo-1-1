import { apiRoute, json, parseBody, requireVerifiedUser } from "@/server/http/handler";
import { presignUploadSchema } from "@/lib/validation";
import { presignImageUpload } from "@/server/services/upload.service";

/**
 * Issues a presigned S3 POST for one complaint image after verifying the
 * caller owns the (pending) complaint, the file type/size and the 5-image cap.
 */
export const POST = apiRoute(async (ctx) => {
  const user = requireVerifiedUser(ctx);
  const input = await parseBody(ctx.req, presignUploadSchema);
  return json(await presignImageUpload(input, user), 201);
});
