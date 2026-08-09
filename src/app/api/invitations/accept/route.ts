import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { acceptStaffInvitation } from "@/modules/saas/application/saas-service";
import { saasHttpError } from "@/modules/saas/presentation/http";

export async function POST(request: Request) { try { const session = await getServerSession(authOptions); return NextResponse.json(await acceptStaffInvitation(session?.user.id ?? null, await request.json())); } catch (error) { return saasHttpError(error); } }
