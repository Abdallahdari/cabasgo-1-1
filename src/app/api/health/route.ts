import { NextResponse } from "next/server";
import { pingDB } from "@/server/db/connect";

/** ALB / ECS health check. Returns 503 when MongoDB is unreachable. */
export async function GET() {
  const db = await pingDB();
  return NextResponse.json(
    { status: db ? "ok" : "degraded", db, time: new Date().toISOString() },
    { status: db ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
