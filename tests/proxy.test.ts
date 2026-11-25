import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const req = (path: string, method: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, "http://localhost:3000"), { method, headers });

describe("proxy: CSRF origin check and CSP", () => {
  it("rejects cross-origin state-changing API requests", async () => {
    const res = proxy(req("/api/complaints", "POST", { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("rejects cross-site requests without an Origin header", () => {
    const res = proxy(req("/api/auth/logout", "POST", { "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
  });

  it("allows same-origin API writes and all API reads", () => {
    expect(proxy(req("/api/complaints", "POST", { origin: "http://localhost:3000" })).status).toBe(200);
    expect(proxy(req("/api/complaints", "GET", { origin: "https://evil.example" })).status).toBe(200);
  });

  it("redirects signed-out visitors away from protected pages with a real 307", () => {
    for (const path of ["/admin", "/admin/users", "/settings", "/me/complaints", "/notifications", "/complaints/new"]) {
      const res = proxy(req(path, "GET"));
      expect(res.status, path).toBe(307);
      expect(res.headers.get("location")).toContain(`/login?next=${encodeURIComponent(path)}`);
    }
    // Public pages are not affected.
    expect(proxy(req("/complaints/abc", "GET")).status).toBe(200);
    expect(proxy(req("/", "GET")).status).toBe(200);
    expect(proxy(req("/admin", "GET", { cookie: "cb_session=x" })).status).toBe(200);
  });

  it("sets a nonce-based CSP on pages", () => {
    const res = proxy(req("/", "GET"));
    const csp = res.headers.get("content-security-policy")!;
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("https://codka-test-bucket.s3.eu-west-1.amazonaws.com");
  });
});
