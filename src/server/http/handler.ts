import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { mongo } from "mongoose";
import { AppError, Errors } from "@/server/http/errors";
import { logger, serializeError } from "@/server/logger";
import { requestMeta } from "@/server/http/request";
import { sessionCookieName, validateSessionToken, type SessionUser } from "@/server/auth/session";
import { assertCan, type Permission } from "@/server/authz/permissions";
import { getEnv } from "@/server/env";

export type ApiContext = {
  req: NextRequest;
  params: Record<string, string>;
  meta: { ip: string; userAgent: string | null };
  /** Current user or null (anonymous visitor). */
  user: SessionUser | null;
};

type Handler = (ctx: ApiContext) => Promise<Response>;

/**
 * Wraps a route handler with: session resolution, consistent JSON errors,
 * Zod -> 400 mapping, duplicate key -> 409 mapping and structured logging.
 */
export function apiRoute(handler: Handler) {
  return async (req: NextRequest, routeCtx: { params: Promise<Record<string, string | string[]>> }) => {
    const started = Date.now();
    try {
      // Catch-all segments ([...key]) arrive as arrays; expose them as "a/b/c".
      const raw = (await routeCtx?.params) ?? {};
      const params = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v.join("/") : v]),
      ) as Record<string, string>;
      const user = await validateSessionToken(req.cookies.get(sessionCookieName())?.value);
      const res = await handler({ req, params, meta: requestMeta(req.headers), user });
      res.headers.set("Cache-Control", "no-store");
      return res;
    } catch (err) {
      return errorResponse(err, req, started);
    }
  };
}

export function errorResponse(err: unknown, req?: NextRequest, started?: number) {
  if (err instanceof AppError) {
    const res = NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
    if (err.status === 429) {
      const retry = (err.details as { retryAfterSeconds?: number })?.retryAfterSeconds;
      if (retry) res.headers.set("Retry-After", String(retry));
    }
    return res;
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: err.issues[0]?.message ?? "Xogta la soo diray ma saxna.",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      { status: 400 },
    );
  }
  if (err instanceof mongo.MongoServerError && err.code === 11000) {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Xogtan horay ayay u jirtay." } },
      { status: 409 },
    );
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: { code: "BAD_JSON", message: "JSON-ka la soo diray ma saxna." } }, { status: 400 });
  }
  logger.error("api.unhandled_error", {
    path: req?.nextUrl.pathname,
    method: req?.method,
    durationMs: started ? Date.now() - started : undefined,
    error: serializeError(err),
  });
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Cillad ayaa dhacday. Fadlan mar kale isku day." } },
    { status: 500 },
  );
}

/** Parse and validate a JSON body (max ~64 KB) with a Zod schema. */
export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 64 * 1024) throw Errors.badRequest("Codsigu aad buu u weyn yahay.");
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw Errors.badRequest("Content-Type waa inuu ahaado application/json.");
  const json = await req.json();
  return schema.parse(json);
}

export function parseQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

export function requireUser(ctx: ApiContext): SessionUser {
  if (!ctx.user) throw Errors.unauthorized();
  return ctx.user;
}

/** Requires a verified email only when REQUIRE_EMAIL_VERIFICATION=true. */
export function requireVerifiedUser(ctx: ApiContext): SessionUser {
  const user = requireUser(ctx);
  if (getEnv().REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
    throw new AppError(403, "EMAIL_NOT_VERIFIED", "Fadlan marka hore xaqiiji email-kaaga.");
  }
  return user;
}

export function requirePermission(ctx: ApiContext, permission: Permission): SessionUser {
  const user = requireUser(ctx);
  assertCan(user.role, permission);
  return user;
}

export const json = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);
