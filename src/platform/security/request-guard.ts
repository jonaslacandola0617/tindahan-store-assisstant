import { NextResponse } from "next/server";
import { consumeRateLimit } from "./rate-limit";

function clientSubject(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown-client";
  const agent = request.headers.get("user-agent")?.slice(0, 160) || "unknown-agent";
  return `${address}:${agent}`;
}

export async function requestRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const result = await consumeRateLimit(scope, clientSubject(request), limit, windowMs);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Too many attempts. Wait a moment and try again.", code: "RATE_LIMITED" },
    { status: 429, headers: { "retry-after": String(result.retryAfterSeconds), "cache-control": "no-store" } },
  );
}
