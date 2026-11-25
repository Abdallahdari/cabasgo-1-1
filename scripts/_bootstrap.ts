/**
 * Shared bootstrap for CLI scripts. Loads .env files for local use; in ECS
 * the variables are injected by the task definition / Secrets Manager.
 * Scripts run with `tsx --conditions=react-server` so `server-only` imports
 * resolve to a no-op outside Next.js.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  const v = process.argv[idx + 1];
  return v && !v.startsWith("--") ? v : "true";
}

export async function run(main: () => Promise<void>) {
  try {
    await main();
    const { disconnectDB } = await import("@/server/db/connect");
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
