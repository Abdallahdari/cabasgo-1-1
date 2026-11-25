/** Creates/updates all MongoDB indexes. Run once per deploy (autoIndex is off in production). */
import { run } from "./_bootstrap";

run(async () => {
  const { connectDB } = await import("@/server/db/connect");
  const models = await import("@/server/db/models");
  await connectDB();
  for (const [name, value] of Object.entries(models)) {
    if (!name.endsWith("Model") || typeof (value as { syncIndexes?: unknown }).syncIndexes !== "function") continue;
    const dropped = await (value as { syncIndexes: () => Promise<string[]> }).syncIndexes();
    console.log(`${name}: indexes synced${dropped.length ? ` (dropped: ${dropped.join(", ")})` : ""}`);
  }
});
