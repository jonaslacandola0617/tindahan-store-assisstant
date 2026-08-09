import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { acceptStaffInvitation } from "@/modules/saas/application/saas-service";
import { saasHttpError } from "@/modules/saas/presentation/http";
import { requestRateLimit } from "@/platform/security/request-guard";

export async function POST(request: Request) { try { const limited = await requestRateLimit(request, "staff-invitation-acceptance", 20, 15 * 60_000); if (limited) return limited; const session = await getServerSession(authOptions); return NextResponse.json(await acceptStaffInvitation(session?.user.id ?? null, await request.json())); } catch (error) { return saasHttpError(error); } }
