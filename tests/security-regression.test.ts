import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { call, clearDb, createUser, seedLocations, startDb, stopDb } from "./helpers";
import * as login from "@/app/api/auth/login/route";
import * as register from "@/app/api/auth/register/route";
import * as profile from "@/app/api/me/profile/route";
import * as complaints from "@/app/api/complaints/route";
import * as complaint from "@/app/api/complaints/[id]/route";
import * as adminUser from "@/app/api/admin/users/[id]/route";
import { safeNextPath } from "@/lib/validation";
import { UserModel } from "@/server/db/models";

/**
 * Regression tests pinning fixes/behaviours confirmed during the security
 * assessment (see SECURITY_AUDIT_REPORT.md). Each asserts the attack fails.
 */
beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe("open redirect hardening (safeNextPath)", () => {
  it("drops absolute, protocol-relative and backslash targets to '/'", () => {
    for (const bad of [
      "https://evil.example",
      "http://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "https:evil.example",
      undefined,
      123 as unknown as string,
    ]) {
      expect(safeNextPath(bad)).toBe("/");
    }
  });
  it("preserves safe same-site relative paths", () => {
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("/complaints/new?x=1")).toBe("/complaints/new?x=1");
  });
});

describe("NoSQL operator injection in auth", () => {
  it("rejects operator objects in login fields (no auth bypass)", async () => {
    await createUser({ email: "victim@example.test", password: "correct-horse-42" });
    for (const body of [
      { email: { $ne: null }, password: { $ne: null } },
      { email: "victim@example.test", password: { $gt: "" } },
    ]) {
      const r = await call(login.POST, { body: body as never });
      expect(r.status).toBe(400);
    }
  });
});

describe("mass assignment / privilege escalation", () => {
  it("ignores role/status/emailVerified at registration", async () => {
    const r = await call(register.POST, {
      body: { name: "Esc", email: "esc@example.test", password: "escalate-pass-1", role: "ADMIN", status: "SUSPENDED", emailVerifiedAt: new Date().toISOString() } as never,
    });
    expect(r.status).toBe(201);
    expect(r.json.user.role).toBe("CITIZEN");
    const u = await UserModel.findOne({ email: "esc@example.test" }).lean();
    expect(u?.role).toBe("CITIZEN");
    expect(u?.status).toBe("ACTIVE");
  });

  it("rejects self role change via profile PATCH (strict schema)", async () => {
    const u = await createUser();
    const r = await call(profile.PATCH, { method: "PATCH", cookie: u.cookie, body: { name: "x", role: "ADMIN" } as never });
    expect(r.status).toBe(400);
    expect((await UserModel.findById(u.id).lean())?.role).toBe("CITIZEN");
  });

  it("never grants ADMIN through the admin user API", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const target = await createUser();
    const r = await call(adminUser.PATCH, { method: "PATCH", cookie: admin.cookie, params: { id: target.id }, body: { role: "ADMIN" } as never });
    expect(r.status).toBe(400);
  });
});

describe("BOLA / IDOR on complaints", () => {
  it("hides, and refuses edits/deletes of, another user's pending complaint", async () => {
    const loc = await seedLocations();
    const owner = await createUser();
    const other = await createUser();
    const created = await call(complaints.POST, {
      cookie: owner.cookie,
      body: { title: "Owner private complaint here", body: "A pending complaint only the owner may see or change.", categoryId: loc.categoryId, regionId: loc.regionId, cityId: loc.cityId },
    });
    const id = created.json.complaint.id;
    expect((await call(complaint.GET, { cookie: other.cookie, params: { id } })).status).toBe(404);
    expect((await call(complaint.PATCH, { method: "PATCH", cookie: other.cookie, params: { id }, body: { title: "Hijacked title now" } })).status).toBe(404);
    expect((await call(complaint.DELETE, { method: "DELETE", cookie: other.cookie, params: { id } })).status).toBe(404);
  });

  it("ignores authorId injection on create (owner is the requester)", async () => {
    const loc = await seedLocations();
    const attacker = await createUser();
    const victim = await createUser();
    const r = await call(complaints.POST, {
      cookie: attacker.cookie,
      body: { title: "Ownership forge attempt x", body: "Trying to assign the complaint to another user via authorId.", authorId: victim.id, categoryId: loc.categoryId, regionId: loc.regionId, cityId: loc.cityId } as never,
    });
    // Strict schema rejects unknown keys.
    expect(r.status).toBe(400);
  });
});
