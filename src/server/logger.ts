/**
 * Minimal structured JSON logger. ECS forwards stdout/stderr to CloudWatch
 * Logs via the awslogs driver; JSON lines are queryable in Logs Insights.
 * Never log secrets, tokens, passwords or full email bodies.
 */
type Level = "debug" | "info" | "warn" | "error";

function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && level !== "error") return;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg,
    ...meta,
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export function serializeError(err: unknown) {
  if (err instanceof Error) return { name: err.name, message: err.message, stack: err.stack };
  return { message: String(err) };
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
};
