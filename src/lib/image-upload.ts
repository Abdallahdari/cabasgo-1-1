"use client";

import { api, ApiError } from "@/lib/api-client";
import { UPLOAD_LIMITS } from "@/lib/constants";
import type { ImageDTO } from "@/types";

const MAX_DIMENSION = 2000;

/**
 * Re-encodes the photo in the browser. This strips EXIF metadata (including
 * GPS coordinates that could identify an anonymous reporter), fixes
 * orientation, and shrinks large photos before upload.
 */
async function reencode(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("encode_failed");
  return jpeg;
}

export function validateImageFile(file: File): string | null {
  if (!(UPLOAD_LIMITS.allowedContentTypes as readonly string[]).includes(file.type)) {
    return `"${file.name}": nooca faylka lama oggola. Isticmaal JPG, PNG ama WebP.`;
  }
  // Raw camera photos may exceed 5 MB; they are re-encoded first, so allow a
  // larger input but the uploaded result must still be <= 5 MB.
  if (file.size > 25 * 1024 * 1024) return `"${file.name}": faylku aad buu u weyn yahay.`;
  return null;
}

/** presign -> direct POST to S3 -> server-side confirmation. */
export async function uploadComplaintImage(complaintId: string, file: File): Promise<ImageDTO> {
  const blob = await reencode(file);
  if (blob.size > UPLOAD_LIMITS.maxImageBytes) {
    throw new ApiError(400, "TOO_LARGE", `"${file.name}": sawirku waa inuusan ka badnaan 5 MB.`);
  }
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const presign = await api<{ imageId: string; upload: { url: string; fields: Record<string, string> } }>(
    "/api/uploads",
    {
      method: "POST",
      body: { complaintId, contentType: blob.type, size: blob.size, fileName: `photo.${ext}` },
    },
  );

  const form = new FormData();
  for (const [k, v] of Object.entries(presign.upload.fields)) form.append(k, v);
  form.append("file", blob, `photo.${ext}`); // must be the last field
  const s3 = await fetch(presign.upload.url, { method: "POST", body: form });
  if (!s3.ok) {
    await api(`/api/uploads/${presign.imageId}`, { method: "DELETE" }).catch(() => undefined);
    throw new ApiError(s3.status, "S3_UPLOAD_FAILED", `"${file.name}": sawirka lama soo gelin karin.`);
  }
  const { image } = await api<{ image: ImageDTO }>(`/api/uploads/${presign.imageId}/confirm`, { method: "POST" });
  return image;
}
