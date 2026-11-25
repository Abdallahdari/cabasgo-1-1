import "server-only";
import type { NextResponse } from "next/server";
import { sessionCookieName, sessionCookieOptions } from "@/server/auth/session";

export function setSessionCookie(res: NextResponse, session: { token: string; expiresAt: Date }) {
  res.cookies.set(sessionCookieName(), session.token, sessionCookieOptions(session.expiresAt));
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(sessionCookieName(), "", { ...sessionCookieOptions(new Date(0)), maxAge: 0 });
}
