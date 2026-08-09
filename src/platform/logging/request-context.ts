import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const safeRequestId = /^[A-Za-z0-9_-]{8,100}$/;

export function requestId(request?: Request) {
  const supplied = request?.headers.get("x-request-id")?.trim();
  return supplied && safeRequestId.test(supplied) ? supplied : randomUUID();
}

export function responseWithRequestId(body: unknown, init: ResponseInit, id: string) {
  const headers = new Headers(init.headers);
  headers.set("x-request-id", id);
  headers.set("cache-control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}
