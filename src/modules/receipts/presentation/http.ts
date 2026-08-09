import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { logger } from "@/platform/logging/logger";
import { ReceiptError } from "../application/errors";

export async function receiptUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new ReceiptError("UNAUTHENTICATED", "Sign in to continue.", 401);
  return session.user.id;
}

export function receiptDatabaseErrorContext(error: unknown) {
  const value = error as { name?: unknown; code?: unknown; meta?: { modelName?: unknown; operation?: unknown; timeout?: unknown } };
  const code = typeof value.code === "string" && /^P\d{4}$/.test(value.code) ? value.code : undefined;
  return {
    error: error instanceof Error ? error.name : "unknown",
    databaseCode: code,
    databaseModel: typeof value.meta?.modelName === "string" ? value.meta.modelName : undefined,
    databaseOperation: typeof value.meta?.operation === "string" ? value.meta.operation : undefined,
    databaseTimeoutMs: typeof value.meta?.timeout === "number" ? value.meta.timeout : undefined,
  };
}

export function receiptHttpError(error: unknown, correlationId?: string) {
  if (error instanceof ReceiptError) return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "Check the information and try again.", code: "VALIDATION", fields: error.flatten().fieldErrors }, { status: 400 });
  logger.error("receipt_request_failed", { correlationId, ...receiptDatabaseErrorContext(error) });
  return NextResponse.json({ error: "We couldn't complete that receipt request. Nothing was changed. Try again.", code: "UNEXPECTED" }, { status: 500 });
}
