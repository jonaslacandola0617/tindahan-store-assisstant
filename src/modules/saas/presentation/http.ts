import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { SaasError } from "../application/errors";
import { logger } from "@/platform/logging/logger";
import { requestId, responseWithRequestId } from "@/platform/logging/request-context";

export async function authenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new SaasError("UNAUTHENTICATED", "Sign in to continue.", 401);
  return session.user.id;
}

export function saasHttpError(error: unknown) {
  const id = requestId();
  if (error instanceof SaasError) return responseWithRequestId({ error: error.message, code: error.code }, { status: error.status }, id);
  if (error instanceof ZodError) return responseWithRequestId({ error: "Check the highlighted details.", code: "VALIDATION", fields: error.flatten().fieldErrors }, { status: 400 }, id);
  logger.error("saas_request_failed", { requestId: id, error });
  return responseWithRequestId({ error: "We couldn't complete that request. Nothing was changed.", code: "UNEXPECTED" }, { status: 500 }, id);
}
