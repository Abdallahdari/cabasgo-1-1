/** Verifies MongoDB connectivity and transaction support. */
import { run } from "./_bootstrap";

run(async () => {
  const { connectDB, pingDB } = await import("@/server/db/connect");
  const m = await connectDB();
  const ok = await pingDB();
  const hello = await m.connection.db!.admin().command({ hello: 1 });
  console.log(
    JSON.stringify({
      ping: ok,
      database: m.connection.db!.databaseName,
      replicaSet: hello.setName ?? null,
      transactionsSupported: Boolean(hello.setName) || hello.msg === "isdbgrid",
    }),
  );
  if (!ok) throw new Error("MongoDB ping failed");
});
