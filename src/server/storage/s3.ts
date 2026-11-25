import "server-only";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "@/server/env";
import { Errors } from "@/server/http/errors";
import { UPLOAD_LIMITS, type AllowedImageType } from "@/lib/constants";

let client: S3Client | null = null;

/**
 * S3 client using the default credential provider chain (ECS task role in
 * production). Access keys are never read in application code and never sent
 * to the browser; the browser only receives short-lived presigned requests.
 */
export function s3(): S3Client {
  if (!client) {
    const env = getEnv();
    client = new S3Client({
      region: env.AWS_REGION,
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: env.S3_FORCE_PATH_STYLE } : {}),
    });
  }
  return client;
}

/** Test hook. */
export function __setS3Client(c: S3Client | null) {
  client = c;
}

function bucket(): string {
  const b = getEnv().S3_BUCKET;
  if (!b) throw Errors.unavailable("Kaydinta sawirrada lama habeyn (S3_BUCKET).");
  return b;
}

export function isStorageConfigured() {
  return Boolean(getEnv().S3_BUCKET);
}

const EXT: Record<AllowedImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Unguessable, unique object key. User-supplied file names are never used in keys. */
export function buildImageKey(complaintId: string, contentType: AllowedImageType) {
  return `complaints/${complaintId}/${randomUUID()}.${EXT[contentType]}`;
}

/**
 * Presigned POST (not PUT) so S3 itself enforces the size limit via the
 * `content-length-range` policy condition and pins the Content-Type.
 */
export async function createImageUploadPost(key: string, contentType: AllowedImageType) {
  const env = getEnv();
  return createPresignedPost(s3(), {
    Bucket: bucket(),
    Key: key,
    Conditions: [
      ["content-length-range", 1, UPLOAD_LIMITS.maxImageBytes],
      ["eq", "$Content-Type", contentType],
      ["eq", "$key", key],
    ],
    Fields: {
      "Content-Type": contentType,
      "x-amz-server-side-encryption": "AES256",
    },
    Expires: env.S3_UPLOAD_URL_TTL_SECONDS,
  });
}

export async function headObject(key: string) {
  try {
    const res = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: res.ContentLength ?? 0, contentType: res.ContentType ?? "" };
  } catch (err) {
    const name = (err as { name?: string }).name;
    if (name === "NotFound" || name === "NoSuchKey") return null;
    throw err;
  }
}

/** Reads the first bytes of an object for magic-number validation. */
export async function readObjectPrefix(key: string, bytes = 16): Promise<Uint8Array> {
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: `bytes=0-${bytes - 1}` }));
  return (await res.Body?.transformToByteArray()) ?? new Uint8Array();
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export async function deleteObjects(keys: string[]) {
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    if (chunk.length === 0) continue;
    await s3().send(
      new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }),
    );
  }
}

/** Short-lived presigned GET for images that are not public yet. */
export async function presignedImageUrl(key: string) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: getEnv().S3_DOWNLOAD_URL_TTL_SECONDS,
  });
}

/**
 * Public delivery URL through CloudFront (bucket stays private; CloudFront
 * reads it with Origin Access Control). Falls back to a presigned URL when no
 * CDN is configured (development).
 */
export async function imageUrl(key: string, isPublic: boolean): Promise<string> {
  const cdn = getEnv().CLOUDFRONT_URL;
  if (isPublic && cdn) return `${cdn.replace(/\/$/, "")}/${key}`;
  return presignedImageUrl(key);
}

/** Validates file signatures; the declared Content-Type is not trusted. */
export function detectImageType(b: Uint8Array): AllowedImageType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  )
    return "image/png";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return "image/webp";
  return null;
}
