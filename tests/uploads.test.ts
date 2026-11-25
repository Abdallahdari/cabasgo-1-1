import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { call, clearDb, createUser, seedLocations, startDb, stopDb } from "./helpers";
import * as complaints from "@/app/api/complaints/route";
import * as moderate from "@/app/api/complaints/[id]/moderate/route";
import * as uploads from "@/app/api/uploads/route";
import * as confirm from "@/app/api/uploads/[id]/confirm/route";
import * as upload from "@/app/api/uploads/[id]/route";
import { ComplaintImageModel, ComplaintModel } from "@/server/db/models";
import { cleanupOrphanedUploads, ORPHAN_AFTER_MS } from "@/server/services/upload.service";
import { detectImageType } from "@/server/storage/s3";

const s3 = mockClient(S3Client);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
const HTML = new TextEncoder().encode("<script>alert(1)</script>");

function body(bytes: Uint8Array) {
  return { transformToByteArray: async () => bytes } as never;
}

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  s3.reset();
});

async function pendingComplaint() {
  const loc = await seedLocations();
  const owner = await createUser();
  const res = await call(complaints.POST, {
    cookie: owner.cookie,
    body: { title: "Qashin aan la qaadin", body: "Qashinka xaafadda lama qaadin muddo bil ah, cudurro ayaa ka dhashay.", categoryId: loc.categoryId, regionId: loc.regionId, cityId: loc.cityId },
  });
  return { owner, id: res.json.complaint.id as string };
}

const presignBody = (complaintId: string, extra: Record<string, unknown> = {}) => ({
  complaintId,
  contentType: "image/png",
  size: 200_000,
  fileName: "photo.png",
  ...extra,
});

describe("presigned upload authorization", () => {
  it("issues a presigned POST that S3 itself size-limits, with a server-generated key", async () => {
    const { owner, id } = await pendingComplaint();
    const res = await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id, { fileName: "../../etc/passwd.png" }) });
    expect(res.status).toBe(201);
    expect(res.json.upload.url).toContain("codka-test-bucket");
    const fields = res.json.upload.fields as Record<string, string>;
    expect(fields.key).toMatch(new RegExp(`^complaints/${id}/[0-9a-f-]{36}\\.png$`));
    expect(fields["Content-Type"]).toBe("image/png");
    const policy = JSON.parse(Buffer.from(fields.Policy, "base64").toString("utf8"));
    expect(policy.conditions).toContainEqual(["content-length-range", 1, 5 * 1024 * 1024]);
    // Nothing secret is returned to the browser.
    expect(res.text).not.toContain(process.env.AWS_SECRET_ACCESS_KEY!);
  });

  it("rejects unauthenticated users and non-owners", async () => {
    const { id } = await pendingComplaint();
    const stranger = await createUser();
    expect((await call(uploads.POST, { body: presignBody(id) })).status).toBe(401);
    expect((await call(uploads.POST, { cookie: stranger.cookie, body: presignBody(id) })).status).toBe(404);
  });

  it("validates type and size", async () => {
    const { owner, id } = await pendingComplaint();
    expect((await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id, { contentType: "image/gif", fileName: "a.gif" }) })).status).toBe(400);
    expect((await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id, { contentType: "image/svg+xml", fileName: "a.svg" }) })).status).toBe(400);
    expect((await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id, { size: 5 * 1024 * 1024 + 1 }) })).status).toBe(400);
    expect((await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id, { fileName: "a.exe" }) })).status).toBe(400);
  });

  it("enforces at most five images per complaint, even concurrently", async () => {
    const { owner, id } = await pendingComplaint();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => call(uploads.POST, { cookie: owner.cookie, body: presignBody(id) })),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(5);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
    expect((await ComplaintModel.findById(id).lean())?.imageCount).toBe(5);
  });

  it("refuses uploads once the complaint is published", async () => {
    const { owner, id } = await pendingComplaint();
    const editor = await createUser({ role: "EDITOR" });
    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } });
    expect((await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id) })).status).toBe(409);
  });
});

describe("upload confirmation", () => {
  it("attaches a real image after verifying size, type and magic bytes", async () => {
    const { owner, id } = await pendingComplaint();
    const presign = await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id) });
    s3.on(HeadObjectCommand).resolves({ ContentLength: 200_000, ContentType: "image/png" });
    s3.on(GetObjectCommand).resolves({ Body: body(PNG) });
    const res = await call(confirm.POST, { cookie: owner.cookie, params: { id: presign.json.imageId } });
    expect(res.status).toBe(200);
    expect((await ComplaintImageModel.findById(presign.json.imageId).lean())?.status).toBe("ATTACHED");
  });

  it("deletes disguised files and frees the slot", async () => {
    const { owner, id } = await pendingComplaint();
    const presign = await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id) });
    s3.on(HeadObjectCommand).resolves({ ContentLength: 100, ContentType: "image/png" });
    s3.on(GetObjectCommand).resolves({ Body: body(HTML) });
    s3.on(DeleteObjectCommand).resolves({});
    const res = await call(confirm.POST, { cookie: owner.cookie, params: { id: presign.json.imageId } });
    expect(res.status).toBe(400);
    expect(s3.commandCalls(DeleteObjectCommand)).toHaveLength(1);
    expect(await ComplaintImageModel.exists({ _id: presign.json.imageId })).toBeNull();
    expect((await ComplaintModel.findById(id).lean())?.imageCount).toBe(0);
  });

  it("rejects objects larger than 5 MB that bypassed the client", async () => {
    const { owner, id } = await pendingComplaint();
    const presign = await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id) });
    s3.on(HeadObjectCommand).resolves({ ContentLength: 6 * 1024 * 1024, ContentType: "image/png" });
    s3.on(DeleteObjectCommand).resolves({});
    expect((await call(confirm.POST, { cookie: owner.cookie, params: { id: presign.json.imageId } })).status).toBe(400);
  });

  it("does not let other users confirm or delete someone else's upload", async () => {
    const { owner, id } = await pendingComplaint();
    const stranger = await createUser();
    const presign = await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id) });
    expect((await call(confirm.POST, { cookie: stranger.cookie, params: { id: presign.json.imageId } })).status).toBe(404);
    expect((await call(upload.DELETE, { method: "DELETE", cookie: stranger.cookie, params: { id: presign.json.imageId } })).status).toBe(404);
  });
});

describe("orphaned upload cleanup", () => {
  it("removes stale unconfirmed uploads from S3 and the database", async () => {
    const { owner, id } = await pendingComplaint();
    await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id) });
    await call(uploads.POST, { cookie: owner.cookie, body: presignBody(id) });
    s3.on(DeleteObjectsCommand).resolves({});

    expect((await cleanupOrphanedUploads()).removed).toBe(0); // too recent
    const later = new Date(Date.now() + ORPHAN_AFTER_MS + 60_000);
    expect((await cleanupOrphanedUploads(later)).removed).toBe(2);
    expect(s3.commandCalls(DeleteObjectsCommand)[0].args[0].input.Delete?.Objects).toHaveLength(2);
    expect((await ComplaintModel.findById(id).lean())?.imageCount).toBe(0);
  });
});

describe("file signature detection", () => {
  it("recognises JPEG, PNG and WebP only", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageType(PNG)).toBe("image/png");
    expect(detectImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(detectImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(detectImageType(HTML)).toBeNull();
  });
});
