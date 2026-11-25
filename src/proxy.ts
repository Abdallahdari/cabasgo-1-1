import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every matched request (Node.js runtime):
 * 1. CSRF defence for the JSON API: state-changing requests must come from
 *    our own origin (in addition to SameSite=Lax session cookies).
 * 2. A per-request nonce-based Content Security Policy for pages.
 *
 * Authorisation is NOT done here; every route handler and page checks the
 * session and role on the server.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Pages that need a signed-in user. Real session + role checks happen on the server. */
const PROTECTED_PATHS = ["/admin", "/settings", "/me", "/notifications", "/complaints/new"];

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
const SESSION_COOKIES = ["__Host-cb_session", "cb_session"];

function allowedOrigins(req: NextRequest): Set<string> {
  const set = new Set<string>([req.nextUrl.origin]);
  if (process.env.APP_URL) set.add(new URL(process.env.APP_URL).origin);
  return set;
}

function s3Origins(): string[] {
  const out: string[] = [];
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;
  if (bucket && region) {
    out.push(`https://${bucket}.s3.${region}.amazonaws.com`, `https://${bucket}.s3.amazonaws.com`);
  }
  if (process.env.S3_ENDPOINT) out.push(new URL(process.env.S3_ENDPOINT).origin);
  return out;
}

function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  const cdn = process.env.CLOUDFRONT_URL ? new URL(process.env.CLOUDFRONT_URL).origin : "";
  const s3 = s3Origins().join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Radix UI positions popovers with inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${cdn} ${s3}`.trim(),
    "font-src 'self'",
    // Browser uploads go straight to S3 using presigned POST policies.
    `connect-src 'self' ${s3}${isDev ? " ws: wss:" : ""}`.trim(),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (!SAFE_METHODS.has(req.method)) {
      const origin = req.headers.get("origin");
      const fetchSite = req.headers.get("sec-fetch-site");
      const sameOrigin = origin ? allowedOrigins(req).has(origin) : fetchSite === null || fetchSite === "same-origin";
      if (!sameOrigin) {
        return NextResponse.json(
          { error: { code: "CSRF_REJECTED", message: "Codsiga lama oggola (origin)." } },
          { status: 403 },
        );
      }
    }
    return NextResponse.next();
  }

  // Optimistic redirect (a real 307 before rendering starts) when there is no
  // session cookie at all. Pages still validate the session and role themselves.
  if (isProtected(pathname)) {
    const hasSession = SESSION_COOKIES.some((c) => req.cookies.has(c));
    if (!hasSession) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname + req.nextUrl.search);
      return NextResponse.redirect(url, 307);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    // Every API request (no exclusions, so the origin check cannot be skipped).
    "/api/:path*",
    // Pages (CSP), excluding static assets and router prefetches.
    {
      source: "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
