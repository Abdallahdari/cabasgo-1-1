import { NextResponse } from "next/server";
import { apiRoute } from "@/server/http/handler";
import { Errors } from "@/server/http/errors";
import { getEnv } from "@/server/env";
import { connectDB } from "@/server/db/connect";
import { ComplaintImageModel } from "@/server/db/models";
import { loadVisibleComplaint } from "@/server/services/complaint.service";
import { gridRead } from "@/server/storage/gridfs";

/**
 * Serves images stored in MongoDB GridFS (STORAGE_DRIVER=mongodb only).
 * The viewer must be allowed to see the complaint the image belongs to:
 * published -> anyone; pending/rejected/hidden -> owner and staff only.
 */
export const GET = apiRoute(async (ctx) => {
  if (getEnv().STORAGE_DRIVER !== "mongodb") throw Errors.notFound();
  const key = ctx.params.key ?? "";
  if (!/^complaints\/[a-f0-9]{24}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key)) throw Errors.notFound();

  await connectDB();
  const image = await ComplaintImageModel.findOne({ key }).lean();
  if (!image) throw Errors.notFound();
  await loadVisibleComplaint(String(image.complaintId), ctx.user);

  const bytes = await gridRead(key);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
