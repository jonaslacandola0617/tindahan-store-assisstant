import { NextResponse } from "next/server";
import { removeStaffAccess } from "@/modules/saas/application/staff-access";
import { authenticatedUserId, saasHttpError } from "@/modules/saas/presentation/http";

export async function DELETE(_request: Request, { params }: { params: Promise<{ membershipId: string }> }) {
  try {
    return NextResponse.json(await removeStaffAccess(await authenticatedUserId(), (await params).membershipId));
  } catch (error) {
    return saasHttpError(error);
  }
}
