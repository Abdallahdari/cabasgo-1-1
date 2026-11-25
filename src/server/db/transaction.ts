import "server-only";
import mongoose, { type ClientSession } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { logger } from "@/server/logger";

let transactionsSupported: boolean | null = null;

/**
 * Multi-document transactions require a replica set or sharded cluster.
 * MongoDB Atlas always provides one; a bare local `mongod` does not.
 */
async function supportsTransactions(): Promise<boolean> {
  if (transactionsSupported !== null) return transactionsSupported;
  const m = await connectDB();
  const hello = await m.connection.db!.admin().command({ hello: 1 });
  transactionsSupported = Boolean(hello.setName) || hello.msg === "isdbgrid";
  if (!transactionsSupported) {
    logger.warn("mongodb.transactions_unsupported", {
      hint: "Run MongoDB as a replica set (Atlas does this) for atomic multi-document writes.",
    });
  }
  return transactionsSupported;
}

/**
 * Run `fn` inside a MongoDB transaction (with automatic retry on transient
 * errors). Every query inside `fn` MUST pass `{ session }`.
 * Falls back to running without a session where transactions are unsupported.
 */
export async function withTransaction<T>(fn: (session: ClientSession | undefined) => Promise<T>): Promise<T> {
  await connectDB();
  if (!(await supportsTransactions())) return fn(undefined);

  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(
      async () => {
        result = await fn(session);
      },
      { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } },
    );
    return result as T;
  } finally {
    await session.endSession();
  }
}
