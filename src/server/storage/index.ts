import "server-only";
import { getEnv } from "@/server/env";
import * as s3 from "@/server/storage/s3";
import { gridDelete, gridHead, gridRead } from "@/server/storage/gridfs";
import type { AllowedImageType } from "@/lib/constants";

/**
 * Storage facade used by the services. Selects the driver from STORAGE_DRIVER:
 *  - "s3"      (staging/production): private S3 bucket, presigned POST uploads,
 *              CloudFront / presigned GET delivery.
 *  - "mongodb" (local development): GridFS; uploads go to /api/uploads/:id/file
 *              and images are served by /api/media/:key with access checks.
 */
const driver = () => getEnv().STORAGE_DRIVER;

export { buildImageKey, detectImageType } from "@/server/storage/s3";

export function isStorageConfigured() {
  return driver() === "mongodb" || s3.isStorageConfigured();
}

export async function createImageUploadPost(key: string, contentType: AllowedImageType, imageId: string) {
  if (driver() === "mongodb") {
    // Same shape as an S3 presigned POST, so the browser code is identical.
    return { url: `/api/uploads/${imageId}/file`, fields: {} as Record<string, string> };
  }
  const post = await s3.createImageUploadPost(key, contentType);
  return { url: post.url, fields: post.fields };
}

export function headObject(key: string) {
  return driver() === "mongodb" ? gridHead(key) : s3.headObject(key);
}

export function readObjectPrefix(key: string, bytes = 16) {
  return driver() === "mongodb" ? gridRead(key, bytes - 1) : s3.readObjectPrefix(key, bytes);
}

export function deleteObject(key: string) {
  return driver() === "mongodb" ? gridDelete(key) : s3.deleteObject(key);
}

export async function deleteObjects(keys: string[]) {
  if (driver() === "mongodb") {
    for (const k of keys) await gridDelete(k);
    return;
  }
  await s3.deleteObjects(keys);
}

export async function imageUrl(key: string, isPublic: boolean) {
  if (driver() === "mongodb") return `/api/media/${key}`;
  return s3.imageUrl(key, isPublic);
}
