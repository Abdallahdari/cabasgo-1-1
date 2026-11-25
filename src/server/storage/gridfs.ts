import "server-only";
import mongoose, { mongo } from "mongoose";
import { connectDB } from "@/server/db/connect";

/**
 * MongoDB GridFS storage driver for local development (STORAGE_DRIVER=mongodb).
 * Objects are stored in the `media.files` / `media.chunks` collections, keyed
 * by the same object key used for S3, so the rest of the app is unchanged.
 */
async function bucket() {
  await connectDB();
  return new mongo.GridFSBucket(mongoose.connection.db!, { bucketName: "media" });
}

export async function gridPut(key: string, data: Uint8Array, contentType: string) {
  const b = await bucket();
  await gridDelete(key); // keys are unique; replace if re-uploaded
  await new Promise<void>((resolve, reject) => {
    const stream = b.openUploadStream(key, { metadata: { contentType } });
    stream.once("finish", () => resolve());
    stream.once("error", reject);
    stream.end(Buffer.from(data));
  });
}

export async function gridHead(key: string) {
  const b = await bucket();
  const file = await b.find({ filename: key }).limit(1).next();
  if (!file) return null;
  return { size: file.length, contentType: String(file.metadata?.contentType ?? "") };
}

export async function gridRead(key: string, end?: number): Promise<Uint8Array> {
  const b = await bucket();
  const chunks: Buffer[] = [];
  const stream = b.openDownloadStreamByName(key, end !== undefined ? { start: 0, end } : undefined);
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return new Uint8Array(Buffer.concat(chunks));
}

export async function gridDelete(key: string) {
  const b = await bucket();
  const files = await b.find({ filename: key }).toArray();
  for (const f of files) await b.delete(f._id);
}
