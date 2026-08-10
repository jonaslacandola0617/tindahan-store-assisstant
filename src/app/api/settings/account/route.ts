import { NextResponse } from "next/server";
import { deactivateAccount } from "@/modules/identity/application/account-lifecycle";
import { authenticatedUserId, saasHttpError } from "@/modules/saas/presentation/http";

export async function DELETE(request: Request) {
  try {
    return NextResponse.json(await deactivateAccount(await authenticatedUserId(), await request.json()));
  } catch (error) {
    return saasHttpError(error);
  }
}
