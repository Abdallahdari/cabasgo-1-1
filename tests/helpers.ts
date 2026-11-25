import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { connectDB, disconnectDB } from "@/server/db/connect";
import { resetEnvCache } from "@/server/env";
import { CategoryModel, CityModel, DistrictModel, RegionModel, UserModel } from "@/server/db/models";
import { hashPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { consoleOutbox } from "@/server/email";
import type { Role } from "@/lib/constants";

let replSet: MongoMemoryReplSet | null = null;

/** Real mongod (single-node replica set, so transactions work). */
export async function startDb() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGODB_URI = replSet.getUri();
  resetEnvCache();
  await connectDB();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

export async function stopDb() {
  await disconnectDB();
  await replSet?.stop();
  replSet = null;
}

export async function clearDb() {
  const db = mongoose.connection.db!;
  for (const c of await db.collections()) await c.deleteMany({});
  consoleOutbox.length = 0;
}

let seq = 0;
export async function createUser(opts: { role?: Role; verified?: boolean; name?: string; email?: string; password?: string } = {}) {
  seq++;
  const password = opts.password ?? "correct-horse-42";
  const user = await UserModel.create({
    name: opts.name ?? `Test User ${seq}`,
    email: opts.email ?? `user${seq}-${Date.now()}@example.test`,
    passwordHash: await hashPassword(password),
    role: opts.role ?? "CITIZEN",
    emailVerifiedAt: opts.verified === false ? null : new Date(),
  });
  const session = await createSession(user._id, { ip: "test", userAgent: "vitest" });
  return { user, id: String(user._id), cookie: `cb_session=${session.token}`, password };
}

export async function seedLocations() {
  const region = await RegionModel.create({ name: "Banaadir", slug: "banaadir" });
  const city = await CityModel.create({ name: "Muqdisho", slug: "muqdisho", regionId: region._id });
  const district = await DistrictModel.create({ name: "Hodan", slug: "hodan", cityId: city._id, regionId: region._id });
  const category = await CategoryModel.create({ name: "Biyaha", slug: "biyaha", icon: "droplets", color: "#0ea5e9" });
  const otherRegion = await RegionModel.create({ name: "Bari", slug: "bari" });
  const otherCity = await CityModel.create({ name: "Boosaaso", slug: "boosaaso", regionId: otherRegion._id });
  return {
    regionId: String(region._id),
    cityId: String(city._id),
    districtId: String(district._id),
    categoryId: String(category._id),
    otherCityId: String(otherCity._id),
  };
}

type RouteHandler = (req: NextRequest, ctx: { params: Promise<Record<string, string | string[]>> }) => Promise<Response>;

/** Invoke a route handler exactly as Next.js would. */
export async function call(
  handler: RouteHandler,
  opts: { method?: string; path?: string; body?: unknown; cookie?: string; params?: Record<string, string | string[]>; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const req = new NextRequest(new URL(opts.path ?? "/api/test", "http://localhost:3000"), {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json: json as Record<string, any>, text, headers: res.headers }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Extracts the raw token from an outbox email link (?token=...). */
export function tokenFromLastEmail(path: string) {
  const msg = [...consoleOutbox].reverse().find((m) => m.text.includes(path));
  if (!msg) throw new Error(`No email containing ${path}`);
  const m = msg.text.match(/token=([A-Za-z0-9_-]{43})/);
  if (!m) throw new Error("No token in email");
  return m[1];
}

export function sessionCookieFrom(headers: Headers) {
  const set = headers.get("set-cookie") ?? "";
  const m = set.match(/cb_session=([^;]*)/);
  return m ? `cb_session=${m[1]}` : null;
}
