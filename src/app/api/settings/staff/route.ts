import { NextResponse } from "next/server";
import { inviteStaff } from "@/modules/saas/application/saas-service";
import { authenticatedUserId, saasHttpError } from "@/modules/saas/presentation/http";

export async function POST(request: Request) { try { return NextResponse.json(await inviteStaff(await authenticatedUserId(), new URL(request.url).origin, await request.json()), { status: 201 }); } catch (error) { return saasHttpError(error); } }
