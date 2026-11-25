/** Removes presigned-but-never-confirmed uploads (S3 objects + DB rows). Schedule hourly. */
import { run } from "./_bootstrap";

run(async () => {
  const { cleanupOrphanedUploads } = await import("@/server/services/upload.service");
  const res = await cleanupOrphanedUploads();
  console.log(`Orphaned uploads removed: ${res.removed}`);
});
