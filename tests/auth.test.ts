import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { call, clearDb, createUser, sessionCookieFrom, startDb, stopDb, tokenFromLastEmail } from "./helpers";
import * as register from "@/app/api/auth/register/route";
import * as login from "@/app/api/auth/login/route";
import * as logout from "@/app/api/auth/logout/route";
import * as me from "@/app/api/auth/me/route";
import * as verifyEmail from "@/app/api/auth/verify-email/route";
import * as resend from "@/app/api/auth/resend-verification/route";
import * as forgot from "@/app/api/auth/forgot-password/route";
import * as reset from "@/app/api/auth/reset-password/route";
import * as profile from "@/app/api/me/profile/route";
import * as adminUsers from "@/app/api/admin/users/[id]/route";
import { SessionModel, UserModel, AuthTokenModel } from "@/server/db/models";
import { consoleOutbox } from "@/server/email";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe("registration", () => {
  it("always creates a CITIZEN, ignoring any role sent by the client", async () => {
    const res = await call(register.POST, {
      body: { name: "Hodan Cali", email: "Hodan@Example.test", password: "strong-pass-123", role: "ADMIN" },
    });
    expect(res.status).toBe(201);
    expect(res.json.user.role).toBe("CITIZEN");
    const user = await UserModel.findOne({ email: "hodan@example.test" }).select("+passwordHash").lean();
    expect(user?.role).toBe("CITIZEN");
    expect(user?.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(user?.emailVerifiedAt).toBeNull();
  });

  it("sets a secure HTTP-only session cookie", async () => {
    const res = await call(register.POST, { body: { name: "Ayaan", email: "ayaan@example.test", password: "strong-pass-123" } });
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/cb_session=/);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    // Only the hash of the token is stored.
    const raw = sessionCookieFrom(res.headers)!.split("=")[1];
    expect(await SessionModel.exists({ tokenHash: raw })).toBeNull();
  });

  it("rejects weak passwords and duplicate emails", async () => {
    expect((await call(register.POST, { body: { name: "A B", email: "a@example.test", password: "short" } })).status).toBe(400);
    await call(register.POST, { body: { name: "A B", email: "dup@example.test", password: "strong-pass-123" } });
    const dup = await call(register.POST, { body: { name: "A B", email: "DUP@example.test", password: "strong-pass-123" } });
    expect(dup.status).toBe(409);
  });
});

describe("login, sessions and logout", () => {
  it("logs in, resolves the session, and revokes it on logout", async () => {
    const { user, password } = await createUser();
    const res = await call(login.POST, { body: { email: user.email, password } });
    expect(res.status).toBe(200);
    const cookie = sessionCookieFrom(res.headers)!;
    expect((await call(me.GET, { cookie })).json.user.email).toBe(user.email);

    await call(logout.POST, { cookie });
    expect((await call(me.GET, { cookie })).json.user).toBeNull();
  });

  it("returns the same error for unknown email and wrong password", async () => {
    const { user } = await createUser();
    const a = await call(login.POST, { body: { email: user.email, password: "wrong-password-1" } });
    const b = await call(login.POST, { body: { email: "nobody@example.test", password: "wrong-password-1" } });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.json.error.message).toBe(b.json.error.message);
  });

  it("rate-limits repeated failed logins per account", async () => {
    const { user, password } = await createUser();
    for (let i = 0; i < 5; i++) {
      expect((await call(login.POST, { body: { email: user.email, password: "wrong-password-1" } })).status).toBe(401);
    }
    const blocked = await call(login.POST, { body: { email: user.email, password } });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("invalidates sessions of suspended users immediately", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const citizen = await createUser();
    expect((await call(me.GET, { cookie: citizen.cookie })).json.user).not.toBeNull();
    const res = await call(adminUsers.PATCH, {
      method: "PATCH",
      cookie: admin.cookie,
      params: { id: citizen.id },
      body: { status: "SUSPENDED" },
    });
    expect(res.status).toBe(200);
    expect((await call(me.GET, { cookie: citizen.cookie })).json.user).toBeNull();
    expect((await call(login.POST, { body: { email: citizen.user.email, password: citizen.password } })).status).toBe(403);
  });
});

describe("email verification", () => {
  it("does not send a verification email on registration by default", async () => {
    await call(register.POST, { body: { name: "Faadumo", email: "f@example.test", password: "strong-pass-123" } });
    expect(consoleOutbox).toHaveLength(0);
  });

  it("verifies (optionally) with a single-use token", async () => {
    const res = await call(register.POST, { body: { name: "Faadumo", email: "f@example.test", password: "strong-pass-123" } });
    await call(resend.POST, { cookie: sessionCookieFrom(res.headers)! });
    const token = tokenFromLastEmail("/verify-email");
    expect(await AuthTokenModel.exists({ tokenHash: token })).toBeNull(); // only hash stored

    expect((await call(verifyEmail.POST, { body: { token } })).status).toBe(200);
    expect((await UserModel.findOne({ email: "f@example.test" }).lean())?.emailVerifiedAt).toBeInstanceOf(Date);
    expect((await call(verifyEmail.POST, { body: { token } })).status).toBe(410);
  });
});

describe("password reset", () => {
  it("does not reveal whether an account exists", async () => {
    const res = await call(forgot.POST, { body: { email: "ghost@example.test" } });
    expect(res.status).toBe(200);
    expect(consoleOutbox).toHaveLength(0);
  });

  it("resets the password once and revokes every session", async () => {
    const { user, cookie } = await createUser();
    await call(forgot.POST, { body: { email: user.email } });
    const token = tokenFromLastEmail("/reset-password");

    expect((await call(reset.POST, { body: { token, password: "brand-new-pass-77" } })).status).toBe(200);
    expect((await call(me.GET, { cookie })).json.user).toBeNull();
    expect((await call(reset.POST, { body: { token, password: "another-pass-88" } })).status).toBe(410);
    expect((await call(login.POST, { body: { email: user.email, password: "brand-new-pass-77" } })).status).toBe(200);
  });

  it("rejects expired reset tokens", async () => {
    const { user } = await createUser();
    await call(forgot.POST, { body: { email: user.email } });
    const token = tokenFromLastEmail("/reset-password");
    await AuthTokenModel.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await call(reset.POST, { body: { token, password: "brand-new-pass-77" } })).status).toBe(410);
  });
});

describe("self-service profile", () => {
  it("never lets a user change their own role", async () => {
    const { id, cookie } = await createUser();
    const res = await call(profile.PATCH, { method: "PATCH", cookie, body: { name: "New Name", role: "ADMIN" } });
    expect(res.status).toBe(400);
    expect((await UserModel.findById(id).lean())?.role).toBe("CITIZEN");
  });
});
