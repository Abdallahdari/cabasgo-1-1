import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { withTransaction } from "@/server/db/transaction";
import { ComplaintImageModel, ComplaintModel } from "@/server/db/models";
import type { SessionUser } from "@/server/auth/session";
import { enforceRateLimit, LIMITS } from "@/server/auth/rate-limit";
import { AppError, Errors } from "@/server/http/errors";
import {
  buildImageKey,
  createImageUploadPost,
  deleteObject,
  deleteObjects,
  detectImageType,
  headObject,
  imageUrl,
  readObjectPrefix,
} from "@/server/storage";
import { UPLOAD_LIMITS } from "@/lib/constants";
import type { PresignUploadInput } from "@/lib/validation";
import { logger, serializeError } from "@/server/logger";
import { getEnv } from "@/server/env";
import { gridPut } from "@/server/storage/gridfs";

/** Uploads not confirmed within this window are treated as orphans. */
export const ORPHAN_AFTER_MS = 60 * 60 * 1000;

async function loadOwnedPendingComplaint(complaintId: string, user: SessionUser) {
  const complaint = await ComplaintModel.findById(complaintId).select("authorId visibility imageCount").lean();
  // Same 404 for "missing" and "not yours" so ids cannot be probed.
  if (!complaint || String(complaint.authorId) !== user.id) throw Errors.notFound("Cabashada lama helin.");
  if (complaint.visibility !== "PENDING") {
    throw Errors.conflict("Sawirro waxaa lagu dari karaa oo keliya inta cabashadu sugayso dib-u-eegis.");
  }
  return complaint;
}

/**
 * Step 1: authorise and reserve an image slot, then return a presigned POST.
 * The slot is reserved with a conditional $inc so concurrent requests can
 * never exceed the per-complaint limit.
 */
export async function presignImageUpload(input: PresignUploadInput, user: SessionUser) {
  await connectDB();
  await enforceRateLimit(`upload:${user.id}`, LIMITS.uploadPresignPerUser.limit, LIMITS.uploadPresignPerUser.window);
  await loadOwnedPendingComplaint(input.complaintId, user);

  const key = buildImageKey(input.complaintId, input.contentType);

  const image = await withTransaction(async (session) => {
    const reserved = await ComplaintModel.findOneAndUpdate(
      {
        _id: input.complaintId,
        authorId: new Types.ObjectId(user.id),
        visibility: "PENDING",
        imageCount: { $lt: UPLOAD_LIMITS.maxImagesPerComplaint },
      },
      { $inc: { imageCount: 1 } },
      { returnDocument: "after", session },
    ).lean();
    if (!reserved) {
      throw new AppError(409, "IMAGE_LIMIT", `Cabasho kasta waxay yeelan kartaa ugu badnaan ${UPLOAD_LIMITS.maxImagesPerComplaint} sawir.`);
    }
    const [img] = await ComplaintImageModel.create(
      [
        {
          complaintId: input.complaintId,
          uploaderId: user.id,
          key,
          contentType: input.contentType,
          size: input.size,
          status: "PENDING",
          order: reserved.imageCount,
        },
      ],
      { session },
    );
    return img;
  });

  try {
    const post = await createImageUploadPost(key, input.contentType, String(image._id));
    return { imageId: String(image._id), upload: post, maxBytes: UPLOAD_LIMITS.maxImageBytes };
  } catch (err) {
    await releaseImage(String(image._id));
    throw err;
  }
}

/**
 * Step 2: after the browser uploaded to S3, verify the object really exists,
 * is within limits and is a real JPEG/PNG/WebP (magic bytes), then attach it.
 * Invalid objects are deleted.
 */
export async function confirmImageUpload(imageId: string, user: SessionUser) {
  await connectDB();
  if (!Types.ObjectId.isValid(imageId)) throw Errors.notFound();
  const image = await ComplaintImageModel.findById(imageId).lean();
  if (!image || String(image.uploaderId) !== user.id) throw Errors.notFound("Sawirka lama helin.");
  await loadOwnedPendingComplaint(String(image.complaintId), user);
  if (image.status === "ATTACHED") {
    return { id: imageId, url: await imageUrl(image.key, false), contentType: image.contentType };
  }

  const head = await headObject(image.key);
  if (!head) throw Errors.badRequest("Sawirka lama helin. Fadlan mar kale soo geli.");

  const reject = async (message: string) => {
    await deleteObject(image.key).catch(() => undefined);
    await releaseImage(imageId);
    throw Errors.badRequest(message);
  };

  if (head.size <= 0 || head.size > UPLOAD_LIMITS.maxImageBytes) await reject("Sawirku waa inuusan ka badnaan 5 MB.");
  if (head.contentType !== image.contentType) await reject("Nooca sawirka ma waafaqsana.");
  const detected = detectImageType(await readObjectPrefix(image.key));
  if (!detected || detected !== image.contentType) await reject("Faylku ma aha sawir JPG, PNG ama WebP ah.");

  await ComplaintImageModel.updateOne(
    { _id: image._id, status: "PENDING" },
    { $set: { status: "ATTACHED", size: head.size, confirmedAt: new Date() } },
  );
  return { id: imageId, url: await imageUrl(image.key, false), contentType: image.contentType };
}

/**
 * MongoDB storage driver only: receives the file the browser would otherwise
 * POST to S3. Same rules as the S3 policy: owner only, pending upload,
 * declared content type, max 5 MB. The real type is verified on confirm.
 */
export async function receiveUploadedFile(imageId: string, user: SessionUser, file: File) {
  if (getEnv().STORAGE_DRIVER !== "mongodb") throw Errors.notFound();
  await connectDB();
  if (!Types.ObjectId.isValid(imageId)) throw Errors.notFound();
  const image = await ComplaintImageModel.findById(imageId).lean();
  if (!image || String(image.uploaderId) !== user.id || image.status !== "PENDING") {
    throw Errors.notFound("Sawirka lama helin.");
  }
  await loadOwnedPendingComplaint(String(image.complaintId), user);
  if (file.size <= 0 || file.size > UPLOAD_LIMITS.maxImageBytes) throw Errors.badRequest("Sawirku waa inuusan ka badnaan 5 MB.");
  if (file.type !== image.contentType) throw Errors.badRequest("Nooca sawirka ma waafaqsana.");
  await gridPut(image.key, new Uint8Array(await file.arrayBuffer()), image.contentType);
}

/** Removes an image row and frees its slot (no storage call). */
async function releaseImage(imageId: string) {
  await withTransaction(async (session) => {
    const img = await ComplaintImageModel.findOneAndDelete({ _id: imageId }, { session }).lean();
    if (img) {
      await ComplaintModel.updateOne(
        { _id: img.complaintId, imageCount: { $gt: 0 } },
        { $inc: { imageCount: -1 } },
        { session },
      );
    }
  });
}

export async function deleteImage(imageId: string, user: SessionUser) {
  await connectDB();
  if (!Types.ObjectId.isValid(imageId)) throw Errors.notFound();
  const image = await ComplaintImageModel.findById(imageId).lean();
  if (!image || String(image.uploaderId) !== user.id) throw Errors.notFound("Sawirka lama helin.");
  await loadOwnedPendingComplaint(String(image.complaintId), user);
  await releaseImage(imageId);
  await deleteObject(image.key).catch((err) =>
    logger.error("s3.delete_failed", { error: serializeError(err) }),
  );
}

/**
 * Deletes uploads that were presigned but never confirmed (abandoned forms,
 * failed uploads). Run on a schedule: `npm run jobs:cleanup-orphans`
 * (an EventBridge-scheduled ECS task in production).
 */
export async function cleanupOrphanedUploads(now = new Date()) {
  await connectDB();
  const cutoff = new Date(now.getTime() - ORPHAN_AFTER_MS);
  const orphans = await ComplaintImageModel.find({ status: "PENDING", createdAt: { $lt: cutoff } })
    .limit(1000)
    .lean();
  if (orphans.length === 0) return { removed: 0 };

  await deleteObjects(orphans.map((o) => o.key));
  for (const o of orphans) await releaseImage(String(o._id));
  logger.info("uploads.orphans_removed", { count: orphans.length });
  return { removed: orphans.length };
}
