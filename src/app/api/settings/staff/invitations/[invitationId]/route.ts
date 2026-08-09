import { NextResponse } from "next/server";
import { revokeStaffInvitation } from "@/modules/saas/application/saas-service";
import { authenticatedUserId, saasHttpError } from "@/modules/saas/presentation/http";

export async function DELETE(_request: Request, { params }: { params: Promise<{ invitationId: string }> }) { try { return NextResponse.json(await revokeStaffInvitation(await authenticatedUserId(), (await params).invitationId)); } catch (error) { return saasHttpError(error); } }
