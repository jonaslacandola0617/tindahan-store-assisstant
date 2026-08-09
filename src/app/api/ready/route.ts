import { NextResponse } from "next/server";
import { database } from "@/platform/persistence/prisma";
import { logger } from "@/platform/logging/logger";
import { requestId } from "@/platform/logging/request-context";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    await database().$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ready", service: "tindahan" },
      { headers: { "cache-control": "no-store", "x-request-id": id } },
    );
  } catch (error) {
    logger.error("readiness_check_failed", { requestId: id, error });
    return NextResponse.json(
      { status: "unavailable", service: "tindahan" },
      { status: 503, headers: { "cache-control": "no-store", "retry-after": "10", "x-request-id": id } },
    );
  }
}
