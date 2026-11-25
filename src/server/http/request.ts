import "server-only";
import { getEnv } from "@/server/env";

/**
 * Client IP derived from X-Forwarded-For, trusting only the configured number
 * of proxy hops (each trusted proxy appends the address it received from).
 * Spoofed left-most entries are ignored.
 */
export function clientIpFromHeaders(headers: Headers): string {
  const hops = getEnv().TRUSTED_PROXY_HOPS;
  if (hops > 0) {
    const parts = (headers.get("x-forwarded-for") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const idx = parts.length - hops;
    if (idx >= 0 && parts[idx]) return parts[idx].slice(0, 64);
  }
  return "local";
}

export function requestMeta(headers: Headers) {
  return {
    ip: clientIpFromHeaders(headers),
    userAgent: headers.get("user-agent")?.slice(0, 300) ?? null,
  };
}
