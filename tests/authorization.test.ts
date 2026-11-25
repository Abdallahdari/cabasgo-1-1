import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { call, clearDb, createUser, seedLocations, startDb, stopDb } from "./helpers";
import * as complaints from "@/app/api/complaints/route";
import * as moderate from "@/app/api/complaints/[id]/moderate/route";
import * as status from "@/app/api/complaints/[id]/status/route";
import * as adminUsers from "@/app/api/admin/users/route";
import * as adminUser from "@/app/api/admin/users/[id]/route";
import * as invitations from "@/app/api/admin/invitations/route";
import * as auditLogs from "@/app/api/admin/audit-logs/route";
import * as reports from "@/app/api/admin/reports/route";
import { UserModel } from "@/server/db/models";
import { can, PERMISSIONS } from "@/server/authz/permissions";
import { resetEnvCache } from "@/server/env";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

async function newComplaint(cookie: string, loc: Awaited<ReturnType<typeof seedLocations>>) {
  const res = await call(complaints.POST, {
    cookie,
    body: {
      title: "Biyo la'aan xaafadda Hodan",
      body: "Muddo labo toddobaad ah biyo ma helin xaafaddeenna oo dhan.",
      categoryId: loc.categoryId,
      regionId: loc.regionId,
      cityId: loc.cityId,
    },
  });
  expect(res.status).toBe(201);
  return res.json.complaint.id as string;
}

describe("permission table", () => {
  it("grants admin-only capabilities to ADMIN only", () => {
    for (const p of ["user:manage", "invitation:manage", "category:manage", "audit:view"] as const) {
      expect(PERMISSIONS[p]).toEqual(["ADMIN"]);
      expect(can("EDITOR", p)).toBe(false);
      expect(can("CITIZEN", p)).toBe(false);
    }
    expect(can("CITIZEN", "complaint:moderate")).toBe(false);
    expect(can("EDITOR", "complaint:moderate")).toBe(true);
    expect(can(null, "complaint:create")).toBe(false);
  });
});

describe("route-level enforcement", () => {
  it("requires authentication but not email verification (by default) to submit complaints", async () => {
    const loc = await seedLocations();
    const body = { title: "Cinwaan tijaabo ah", body: "Faahfaahin ku filan oo tijaabo ah halkan.", categoryId: loc.categoryId, regionId: loc.regionId, cityId: loc.cityId };
    expect((await call(complaints.POST, { body })).status).toBe(401);
    const unverified = await createUser({ verified: false });
    expect((await call(complaints.POST, { cookie: unverified.cookie, body })).status).toBe(201);
  });

  it("enforces email verification when REQUIRE_EMAIL_VERIFICATION=true", async () => {
    const loc = await seedLocations();
    const body = { title: "Cinwaan tijaabo ah", body: "Faahfaahin ku filan oo tijaabo ah halkan.", categoryId: loc.categoryId, regionId: loc.regionId, cityId: loc.cityId };
    process.env.REQUIRE_EMAIL_VERIFICATION = "true";
    resetEnvCache();
    try {
      const unverified = await createUser({ verified: false });
      const res = await call(complaints.POST, { cookie: unverified.cookie, body });
      expect(res.status).toBe(403);
      expect(res.json.error.code).toBe("EMAIL_NOT_VERIFIED");
    } finally {
      delete process.env.REQUIRE_EMAIL_VERIFICATION;
      resetEnvCache();
    }
  });

  it("rejects mismatched region/city combinations", async () => {
    const loc = await seedLocations();
    const citizen = await createUser();
    const res = await call(complaints.POST, {
      cookie: citizen.cookie,
      body: { title: "Cinwaan tijaabo ah", body: "Faahfaahin ku filan oo tijaabo ah halkan.", categoryId: loc.categoryId, regionId: loc.regionId, cityId: loc.otherCityId },
    });
    expect(res.status).toBe(400);
  });

  it("blocks citizens from moderation, status changes and admin APIs", async () => {
    const loc = await seedLocations();
    const citizen = await createUser();
    const id = await newComplaint(citizen.cookie, loc);
    expect((await call(moderate.POST, { cookie: citizen.cookie, params: { id }, body: { action: "APPROVE" } })).status).toBe(403);
    expect((await call(status.POST, { cookie: citizen.cookie, params: { id }, body: { status: "RESOLVED" } })).status).toBe(403);
    expect((await call(adminUsers.GET, { cookie: citizen.cookie })).status).toBe(403);
    expect((await call(reports.GET, { cookie: citizen.cookie })).status).toBe(403);
    expect((await call(invitations.POST, { cookie: citizen.cookie, body: { email: "x@example.test" } })).status).toBe(403);
  });

  it("lets editors moderate but not manage users, invitations or audit logs", async () => {
    const loc = await seedLocations();
    const citizen = await createUser();
    const editor = await createUser({ role: "EDITOR" });
    const id = await newComplaint(citizen.cookie, loc);
    expect((await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } })).status).toBe(200);
    expect((await call(status.POST, { cookie: editor.cookie, params: { id }, body: { status: "IN_PROGRESS" } })).status).toBe(200);
    expect((await call(adminUsers.GET, { cookie: editor.cookie })).status).toBe(403);
    expect((await call(invitations.POST, { cookie: editor.cookie, body: { email: "x@example.test" } })).status).toBe(403);
    expect((await call(auditLogs.GET, { cookie: editor.cookie })).status).toBe(403);
  });

  it("enforces valid status transitions", async () => {
    const loc = await seedLocations();
    const citizen = await createUser();
    const editor = await createUser({ role: "EDITOR" });
    const id = await newComplaint(citizen.cookie, loc);
    // Not published yet -> cannot change status.
    expect((await call(status.POST, { cookie: editor.cookie, params: { id }, body: { status: "RESOLVED" } })).status).toBe(409);
    await call(moderate.POST, { cookie: editor.cookie, params: { id }, body: { action: "APPROVE" } });
    await call(status.POST, { cookie: editor.cookie, params: { id }, body: { status: "CLOSED" } });
    // CLOSED -> RESOLVED is not an allowed transition.
    expect((await call(status.POST, { cookie: editor.cookie, params: { id }, body: { status: "RESOLVED" } })).status).toBe(400);
  });
});

describe("role management", () => {
  it("prevents admins from changing their own role or status", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const res = await call(adminUser.PATCH, { method: "PATCH", cookie: admin.cookie, params: { id: admin.id }, body: { status: "SUSPENDED" } });
    expect(res.status).toBe(403);
  });

  it("never assigns ADMIN through the API and never modifies other admins", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const other = await createUser({ role: "ADMIN" });
    const citizen = await createUser();
    expect(
      (await call(adminUser.PATCH, { method: "PATCH", cookie: admin.cookie, params: { id: citizen.id }, body: { role: "ADMIN" } })).status,
    ).toBe(400);
    expect(
      (await call(adminUser.PATCH, { method: "PATCH", cookie: admin.cookie, params: { id: other.id }, body: { role: "CITIZEN" } })).status,
    ).toBe(403);
    expect((await UserModel.findById(other.id).lean())?.role).toBe("ADMIN");
  });

  it("allows an admin to demote an editor and records it in the audit log", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const editor = await createUser({ role: "EDITOR" });
    const res = await call(adminUser.PATCH, { method: "PATCH", cookie: admin.cookie, params: { id: editor.id }, body: { role: "CITIZEN" } });
    expect(res.status).toBe(200);
    expect((await UserModel.findById(editor.id).lean())?.role).toBe("CITIZEN");
    const logs = await call(auditLogs.GET, { cookie: admin.cookie });
    expect(logs.json.items.some((l: { action: string }) => l.action === "user.update")).toBe(true);
  });
});
