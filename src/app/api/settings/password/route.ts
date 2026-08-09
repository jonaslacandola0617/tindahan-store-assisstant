import { NextResponse } from "next/server";
import { changePassword } from "@/modules/saas/application/saas-service";
import { authenticatedUserId, saasHttpError } from "@/modules/saas/presentation/http";

export async function PATCH(request: Request) { try { return NextResponse.json(await changePassword(await authenticatedUserId(), await request.json())); } catch (error) { return saasHttpError(error); } }
