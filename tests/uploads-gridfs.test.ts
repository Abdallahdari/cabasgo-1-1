import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { call, clearDb, createUser, seedLocations, startDb, stopDb } from "./helpers";
import * as complaints from "@/app/api/complaints/route";
import * as complaintRoute from "@/app/api/complaints/[id]/route";
import * as moderate from "@/app/api/complaints/[id]/moderate/route";
import * as uploads from "@/app/api/uploads/route";
import * as uploadFile from "@/app/api/uploads/[id]/file/route";
import * as confirm from "@/app/api/uploads/[id]/confirm/route";
import * as media from "@/app/api/media/[...key]/route";
import { ComplaintImageModel, ComplaintModel } from "@/server/db/models";
import { resetEnvCache } from "@/server/env";
import { cleanupOrphanedUploads, ORPHAN_AFTER_MS } from "@/server/services/upload.service";
import { gridHead } from "@/server/storage/gridfs";

// A tiny valid PNG (1x1).
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

beforeAll(async () => {
  process.env.STORAGE_DRIVER = "mongodb";
  resetEnvCache();
  await startDb();
});
afterAll(async () => {
  await stopDb();
  process.env.STORAGE_DRIVER = "s3";
  resetEnvCache();
});
beforeEach(clearDb);

/** Sends multipart form data with one file, exactly like the browser does. */
async function sendFile(imageId: string, cookie: string, bytes: Buffer, type: string) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type }), "photo");
  const req = new NextRequest(new URL(`/api/uploads/${imageId}/file`, "http://localhost:3000"), {
    method: "POST",
    headers: { cookie },
    body: form,
  });
  const res = await uploadFile.POST(req, { params: Promise.resolve({ id: imageId }) });
  return res.status;
}

async function pendingComplaint() {
  const loc = await seedLocations();
  const owner = await createUser({ verified: false }); // no email verification needed
  const res = await call(complaints.POST, {
    cookie: owner.cookie,
    body: { title: "Waddo burbursan", body: "Waddadu waxay leedahay godad waaweyn oo shilal sababa.", categoryId: loc.categoryId, regionId: loc.regionId, cityId: loc.cityId },
  });
  expect(res.status).toBe(201);
  return { owner, id: res.json.complaint.id as string };
}

async function presign(cookie: string, complaintId: string) {
  const res = await call(uploads.POST, {
    cookie,
    body: { complaintId, contentType: "image/png", size: PNG.length, fileName: "photo.png" },
  });
  expect(res.status).toBe(201);
  expect(res.json.upload.url).toBe(`/api/uploads/${res.json.imageId}/file`);
  return res.json.imageId as string;
}

describe("MongoDB GridFS image storage (local development)", () => {
  it("stores, confirms and serves an image with access control", async () => {
    const { owner, id } = await pendingComplaint();
    const imageId = await presign(owner.cookie, id);
    expect(await sendFile(imageId, owner.cookie, PNG, "image/png")).toBe(201);

    const confirmed = await call(confirm.POST, { cookie: owner.cookie, params: { id: imageId } });
    expect(confirmed.status).toBe(200);
    const url = confirmed.json.image.url as string;
    expect(url).toMatch(/^\/api\/media\/complaints\//);
    const key = url.replace("/api/media/", "");
    expect((await gridHead(key))?.size).toBe(PNG.length);

    // Pending complaint: owner can see the image, strangers cannot.
    const stranger = await createUser();
    expect((await call(media.GET, { cookie: owner.cookie, params: { key: key.split("/") } })).status).toBe(200);
    expect((await call(media.GET, { cookie: stranger.cookie, params: { key: key.split("/") } })).status).toBe(404);
    expect((await call(media.GET, { params: { key: key.split("/") } })).status).toBe(404);

    // Published: everyone can see it, with the right content type.
    const editor = await createUser({ role: "EDITOR" });
    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } });
    const pub = await call(media.GET, { params: { key: key.split("/") } });
    expect(pub.status).toBe(200);
    expect(pub.headers.get("content-type")).toBe("image/png");

    const detail = await call(complaintRoute.GET, { params: { id } });
    expect(detail.json.complaint.images).toHaveLength(1);
  });

  it("rejects non-owners, wrong types and fake images", async () => {
    const { owner, id } = await pendingComplaint();
    const stranger = await createUser();
    const imageId = await presign(owner.cookie, id);

    expect(await sendFile(imageId, stranger.cookie, PNG, "image/png")).toBe(404);
    expect(await sendFile(imageId, owner.cookie, PNG, "image/jpeg")).toBe(400);

    // Declared PNG, but the bytes are HTML: stored, then rejected and deleted on confirm.
    expect(await sendFile(imageId, owner.cookie, Buffer.from("<script>alert(1)</script>"), "image/png")).toBe(201);
    const res = await call(confirm.POST, { cookie: owner.cookie, params: { id: imageId } });
    expect(res.status).toBe(400);
    expect(await ComplaintImageModel.exists({ _id: imageId })).toBeNull();
    expect((await ComplaintModel.findById(id).lean())?.imageCount).toBe(0);
  });

  it("rejects files larger than 5 MB", async () => {
    const { owner, id } = await pendingComplaint();
    const imageId = await presign(owner.cookie, id);
    expect(await sendFile(imageId, owner.cookie, Buffer.alloc(5 * 1024 * 1024 + 1), "image/png")).toBe(400);
  });

  it("cleans up abandoned uploads from GridFS", async () => {
    const { owner, id } = await pendingComplaint();
    const imageId = await presign(owner.cookie, id);
    await sendFile(imageId, owner.cookie, PNG, "image/png");
    const key = (await ComplaintImageModel.findById(imageId).lean())!.key;
    expect(await gridHead(key)).not.toBeNull();
    const res = await cleanupOrphanedUploads(new Date(Date.now() + ORPHAN_AFTER_MS + 60_000));
    expect(res.removed).toBe(1);
    expect(await gridHead(key)).toBeNull();
  });
});
