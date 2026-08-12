import { NextResponse } from "next/server";
import { changePassword } from "@/modules/saas/application/saas-service";
import { authenticatedUserId, saasHttpError } from "@/modules/saas/presentation/http";
import { serverEnvironment } from "@/platform/environment/server";
import { requestRateLimit } from "@/platform/security/request-guard";

export async function PATCH(request: Request) {
  try {
    if (serverEnvironment.showcaseMode) {
      return NextResponse.json({ error: "Password changes are disabled in the public employer showcase." }, { status: 403 });
    }
    const limited = await requestRateLimit(request, "password-change", 10, 15 * 60_000);
    if (limited) return limited;
    return NextResponse.json(await changePassword(await authenticatedUserId(), await request.json()));
  } catch (error) {
    return saasHttpError(error);
  }
}
