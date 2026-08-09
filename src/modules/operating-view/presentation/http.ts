import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { logger } from "@/platform/logging/logger";
import { OperatingViewError } from "../application/operating-view-service";

export async function operatingViewUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new OperatingViewError("FORBIDDEN", "Sign in to continue.", 401);
  return session.user.id;
}

export function operatingViewHttpError(error: unknown) {
  if (error instanceof OperatingViewError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "Check the information and try again.", code: "INVALID_INPUT" }, { status: 400 });
  logger.error("operating_view_request_failed", { error: error instanceof Error ? error.name : "unknown" });
  return NextResponse.json({ error: "We couldn't load this information. Try again.", code: "UNAVAILABLE" }, { status: 500 });
}
