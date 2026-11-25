import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { call, clearDb, createUser, seedLocations, startDb, stopDb } from "./helpers";
import * as complaints from "@/app/api/complaints/route";
import * as complaint from "@/app/api/complaints/[id]/route";
import * as moderate from "@/app/api/complaints/[id]/moderate/route";
import * as status from "@/app/api/complaints/[id]/status/route";
import * as comments from "@/app/api/complaints/[id]/comments/route";
import * as like from "@/app/api/complaints/[id]/like/route";
import * as follow from "@/app/api/complaints/[id]/follow/route";
import * as history from "@/app/api/complaints/[id]/history/route";
import * as notifications from "@/app/api/notifications/route";
import * as mine from "@/app/api/me/complaints/route";
import * as reportsApi from "@/app/api/reports/route";
import * as adminReport from "@/app/api/admin/reports/[id]/route";
import * as adminReports from "@/app/api/admin/reports/route";
import { ComplaintModel, ContentReportModel } from "@/server/db/models";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

async function setup(isAnonymous: boolean) {
  const loc = await seedLocations();
  const owner = await createUser({ name: "Xasan Maxamed Cali", email: "xasan.private@example.test" });
  const editor = await createUser({ role: "EDITOR", name: "Tifaftire Ahmed" });
  const created = await call(complaints.POST, {
    cookie: owner.cookie,
    body: {
      title: "Waddo burbursan oo khatar ah",
      body: "Waddada weyn ee xaafadda waxaa ku jira godad waaweyn oo shilal sababay.",
      categoryId: loc.categoryId,
      regionId: loc.regionId,
      cityId: loc.cityId,
      districtId: loc.districtId,
      isAnonymous,
    },
  });
  expect(created.status).toBe(201);
  return { owner, editor, id: created.json.complaint.id as string, loc };
}

function expectNoPrivateData(text: string, owner: { id: string; user: { name: string; email: string } }) {
  expect(text).not.toContain(owner.user.email);
  expect(text).not.toContain(owner.id);
  expect(text).not.toContain("passwordHash");
  expect(text).not.toContain("authorId");
}

describe("moderation visibility", () => {
  it("keeps pending complaints private to the owner and staff", async () => {
    const { owner, editor, id } = await setup(false);
    const stranger = await createUser();

    expect((await call(complaint.GET, { params: { id } })).status).toBe(404);
    expect((await call(complaint.GET, { cookie: stranger.cookie, params: { id } })).status).toBe(404);
    expect((await call(complaints.GET, {})).json.items).toHaveLength(0);

    const asOwner = await call(complaint.GET, { cookie: owner.cookie, params: { id } });
    expect(asOwner.status).toBe(200);
    expect(asOwner.json.complaint.viewer.isOwner).toBe(true);
    expect((await call(complaint.GET, { cookie: editor.cookie, params: { id } })).status).toBe(200);

    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } });
    const pub = await call(complaint.GET, { params: { id } });
    expect(pub.status).toBe(200);
    expect(pub.json.complaint.viewer.isOwner).toBe(false);
    expect((await call(complaints.GET, {})).json.items).toHaveLength(1);
  });

  it("rejection requires a reason and the owner sees it", async () => {
    const { owner, editor, id } = await setup(false);
    expect((await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "REJECT" } })).status).toBe(400);
    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "REJECT", note: "Macluumaad ku filan ma laha." } });
    const asOwner = await call(complaint.GET, { cookie: owner.cookie, params: { id } });
    expect(asOwner.json.complaint.visibility).toBe("REJECTED");
    expect(asOwner.json.complaint.moderationNote).toContain("Macluumaad");
    const notes = await call(notifications.GET, { cookie: owner.cookie });
    expect(notes.json.items[0].type).toBe("COMPLAINT_REJECTED");
  });
});

describe("public privacy", () => {
  it("never exposes the identity of an anonymous reporter — to the public, users or staff", async () => {
    const { owner, editor, id } = await setup(true);
    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } });

    for (const cookie of [undefined, editor.cookie, (await createUser()).cookie]) {
      const detail = await call(complaint.GET, { cookie, params: { id } });
      expect(detail.json.complaint.author).toBeNull();
      expect(detail.json.complaint.isAnonymous).toBe(true);
      expect(detail.text).not.toContain(owner.user.name);
      expectNoPrivateData(detail.text, owner);

      const list = await call(complaints.GET, { cookie });
      expect(list.text).not.toContain(owner.user.name);
      expectNoPrivateData(list.text, owner);
    }
  });

  it("keeps the anonymous owner anonymous when they comment", async () => {
    const { owner, editor, id } = await setup(true);
    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } });
    const posted = await call(comments.POST, { cookie: owner.cookie, params: { id }, body: { body: "Weli waa sidii." } });
    expect(posted.status).toBe(201);
    expect(posted.json.comment.isAnonymous).toBe(true);
    const list = await call(comments.GET, { params: { id } });
    expect(list.json.items[0].author).toBeNull();
    expect(list.text).not.toContain(owner.user.name);
    expectNoPrivateData(list.text, owner);
  });

  it("shows only the public name (no email/id) for named complaints", async () => {
    const { owner, editor, id } = await setup(false);
    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } });
    const detail = await call(complaint.GET, { params: { id } });
    expect(detail.json.complaint.author).toEqual({ name: owner.user.name, role: "CITIZEN" });
    expectNoPrivateData(detail.text, owner);
  });

  it("anonymous owner can still track their own complaint", async () => {
    const { owner, id } = await setup(true);
    const res = await call(mine.GET, { cookie: owner.cookie });
    expect(res.json.items.map((c: { id: string }) => c.id)).toContain(id);
    expect(res.json.items[0].viewer.isOwner).toBe(true);
  });

  it("only the owner can edit or delete, and only while pending", async () => {
    const { owner, editor, id } = await setup(false);
    const stranger = await createUser();
    expect((await call(complaint.PATCH, { method: "PATCH", cookie: stranger.cookie, params: { id }, body: { title: "Hacked title here" } })).status).toBe(404);
    expect((await call(complaint.PATCH, { method: "PATCH", cookie: owner.cookie, params: { id }, body: { title: "Cinwaan la saxay oo cusub" } })).status).toBe(200);
    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } });
    expect((await call(complaint.PATCH, { method: "PATCH", cookie: owner.cookie, params: { id }, body: { title: "Cinwaan kale oo cusub" } })).status).toBe(409);
    expect((await call(complaint.DELETE, { method: "DELETE", cookie: owner.cookie, params: { id } })).status).toBe(403);
  });
});

describe("status tracking, engagement and notifications", () => {
  it("records history and notifies followers on status change", async () => {
    const { owner, editor, id } = await setup(true);
    const follower = await createUser();
    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } });
    expect((await call(follow.PUT, { method: "PUT", cookie: follower.cookie, params: { id } })).json).toEqual({ active: true, count: 2 });

    const res = await call(status.POST, {
      cookie: editor.cookie,
      params: { id },
      body: { status: "IN_PROGRESS", note: "Shaqaale ayaa la diray." },
    });
    expect(res.status).toBe(200);
    expect(res.json.complaint.status).toBe("IN_PROGRESS");

    const h = await call(history.GET, { params: { id } });
    expect(h.json.history.map((x: { toStatus: string }) => x.toStatus)).toEqual(["OPEN", "IN_PROGRESS"]);
    expect(h.text).not.toContain(owner.user.name);

    for (const u of [owner, follower]) {
      const n = await call(notifications.GET, { cookie: u.cookie });
      expect(n.json.items.some((x: { type: string }) => x.type === "STATUS_CHANGED")).toBe(true);
    }
  });

  it("likes are idempotent and counted atomically", async () => {
    const { editor, id } = await setup(false);
    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } });
    const fan = await createUser();
    await Promise.all([1, 2, 3].map(() => call(like.PUT, { method: "PUT", cookie: fan.cookie, params: { id } })));
    expect((await ComplaintModel.findById(id).lean())?.likeCount).toBe(1);
    const off = await call(like.DELETE, { method: "DELETE", cookie: fan.cookie, params: { id } });
    expect(off.json).toEqual({ active: false, count: 0 });
  });

  it("reporting and resolving hides content and closes duplicate reports", async () => {
    const { editor, id } = await setup(false);
    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } });
    const a = await createUser();
    const b = await createUser();
    for (const u of [a, b]) {
      expect((await call(reportsApi.POST, { cookie: u.cookie, body: { targetType: "COMPLAINT", targetId: id, reason: "FALSE_INFORMATION" } })).status).toBe(201);
    }
    expect((await call(reportsApi.POST, { cookie: a.cookie, body: { targetType: "COMPLAINT", targetId: id, reason: "SPAM" } })).status).toBe(409);

    const open = await call(adminReports.GET, { cookie: editor.cookie });
    expect(open.json.total).toBe(2);
    await call(adminReport.PATCH, {
      method: "PATCH",
      cookie: editor.cookie,
      params: { id: open.json.items[0].id },
      body: { status: "RESOLVED", hideContent: true, note: "Been abuur." },
    });
    expect((await call(complaint.GET, { params: { id } })).status).toBe(404);
    expect(await ContentReportModel.countDocuments({ status: "OPEN" })).toBe(0);
  });
});
