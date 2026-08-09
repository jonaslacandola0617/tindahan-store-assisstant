import { NextResponse } from "next/server";
import { authenticatedUserId } from "@/modules/saas/presentation/http";
import { resendStaffInvitation } from "@/modules/saas/application/saas-service";
import { saasHttpError } from "@/modules/saas/presentation/http";
export async function POST(request: Request, { params }: { params: Promise<{ invitationId: string }> }) { try { return NextResponse.json(await resendStaffInvitation(await authenticatedUserId(), new URL(request.url).origin, (await params).invitationId), { status: 201 }); } catch (error) { return saasHttpError(error); } }
