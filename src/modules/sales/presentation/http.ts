import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { SalesError } from "../application/errors";
import { logger } from "@/platform/logging/logger";
import { requestId, responseWithRequestId } from "@/platform/logging/request-context";

export async function salesUserId(){const session=await getServerSession(authOptions);if(!session?.user.id)throw new SalesError("UNAUTHENTICATED","Sign in to continue.",401);return session.user.id;}
export function salesHttpError(error:unknown){const id=requestId();if(error instanceof SalesError)return responseWithRequestId({error:error.message,code:error.code,conflicts:error.conflicts},{status:error.status},id);if(error instanceof ZodError)return responseWithRequestId({error:"Check the sale details and try again.",code:"VALIDATION",fields:error.flatten().fieldErrors},{status:400},id);logger.error("sales_request_failed",{requestId:id,error});return responseWithRequestId({error:"We couldn't complete that request. Nothing was changed. Try again.",code:"UNEXPECTED"},{status:500},id);}
