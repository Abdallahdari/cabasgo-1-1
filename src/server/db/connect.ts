import "server-only";
import mongoose from "mongoose";
import { getEnv } from "@/server/env";
import { logger } from "@/server/logger";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// Reuse a single connection pool across hot reloads (dev) and requests (prod).
const globalForMongoose = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = globalForMongoose.__mongoose ?? { conn: null, promise: null };
globalForMongoose.__mongoose = cache;

// Unknown filter keys are dropped. Operator injection is prevented because every
// user-supplied value is parsed by Zod into primitives / ObjectIds before it
// reaches a query (see src/lib/validation and src/server/http/parse.ts).
mongoose.set("strictQuery", true);

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!cache.promise) {
    const env = getEnv();
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        maxPoolSize: 20,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        // In production indexes are created by `npm run db:indexes` during deploy,
        // not by every container on boot.
        autoIndex: env.APP_ENV === "development" && env.NODE_ENV !== "production",
        retryWrites: true,
      })
      .then((m) => {
        logger.info("mongodb.connected", { db: env.MONGODB_DB_NAME });
        return m;
      })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB() {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}

/** Round-trip ping used by the /api/health endpoint. */
export async function pingDB(): Promise<boolean> {
  try {
    const m = await connectDB();
    const res = await m.connection.db!.admin().ping();
    return res?.ok === 1;
  } catch (err) {
    logger.warn("mongodb.ping_failed", { error: (err as Error).message });
    return false;
  }
}
