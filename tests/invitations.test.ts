import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { call, clearDb, createUser, sessionCookieFrom, startDb, stopDb, tokenFromLastEmail } from "./helpers";
import * as invitations from "@/app/api/admin/invitations/route";
import * as invitation from "@/app/api/admin/invitations/[id]/route";
import * as accept from "@/app/api/invitations/accept/route";
import * as me from "@/app/api/auth/me/route";
import { EditorInvitationModel, UserModel } from "@/server/db/models";
import { hashToken } from "@/server/auth/crypto";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

async function invite(email: string) {
  const admin = await createUser({ role: "ADMIN" });
  const res = await call(invitations.POST, { cookie: admin.cookie, body: { email } });
  expect(res.status).toBe(201);
  return { admin, token: tokenFromLastEmail("/invitations/accept"), id: res.json.invitation.id as string };
}

describe("editor invitations", () => {
  it("stores only a hash of a 256-bit token", async () => {
    const { token } = await invite("new.editor@example.test");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const doc = await EditorInvitationModel.findOne().lean();
    expect(doc?.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(doc)).not.toContain(token);
  });

  it("creates a verified EDITOR account and can only be used once", async () => {
    const { token } = await invite("new.editor@example.test");
    const first = await call(accept.POST, { body: { token, name: "Tifaftire Cusub", password: "editor-pass-123" } });
    expect(first.status).toBe(200);
    const cookie = sessionCookieFrom(first.headers)!;
    expect((await call(me.GET, { cookie })).json.user.role).toBe("EDITOR");
    const user = await UserModel.findOne({ email: "new.editor@example.test" }).lean();
    expect(user?.emailVerifiedAt).toBeInstanceOf(Date);

    const second = await call(accept.POST, { body: { token, name: "Attacker", password: "attacker-pass-1" } });
    expect(second.status).toBe(410);
  });

  it("is single-use under concurrent acceptance", async () => {
    const { token } = await invite("race@example.test");
    const results = await Promise.all(
      [1, 2, 3].map(() => call(accept.POST, { body: { token, name: "Racer", password: "racer-pass-123" } })),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(await UserModel.countDocuments({ email: "race@example.test" })).toBe(1);
  });

  it("rejects expired invitations", async () => {
    const { token } = await invite("late@example.test");
    await EditorInvitationModel.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await call(accept.POST, { body: { token, name: "Late", password: "late-pass-1234" } });
    expect(res.status).toBe(410);
    expect(await UserModel.exists({ email: "late@example.test" })).toBeNull();
  });

  it("rejects revoked invitations", async () => {
    const { admin, token, id } = await invite("revoked@example.test");
    expect((await call(invitation.DELETE, { method: "DELETE", cookie: admin.cookie, params: { id } })).status).toBe(200);
    expect((await call(accept.POST, { body: { token, name: "Nope", password: "nope-pass-1234" } })).status).toBe(410);
  });

  it("requires an existing account holder to be signed in as that account", async () => {
    const existing = await createUser({ email: "citizen@example.test" });
    const stranger = await createUser();
    const { token } = await invite("citizen@example.test");
    expect((await call(accept.POST, { body: { token } })).status).toBe(401);
    expect((await call(accept.POST, { cookie: stranger.cookie, body: { token } })).status).toBe(401);
    expect((await call(accept.POST, { cookie: existing.cookie, body: { token } })).status).toBe(200);
    expect((await UserModel.findById(existing.id).lean())?.role).toBe("EDITOR");
  });

  it("re-inviting revokes the previous pending invitation", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await call(invitations.POST, { cookie: admin.cookie, body: { email: "twice@example.test" } });
    const firstToken = tokenFromLastEmail("/invitations/accept");
    await call(invitations.POST, { cookie: admin.cookie, body: { email: "twice@example.test" } });
    expect((await call(accept.POST, { body: { token: firstToken, name: "Old", password: "old-pass-12345" } })).status).toBe(410);
  });
});
