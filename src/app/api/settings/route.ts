import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/modules/saas/application/saas-service";
import { authenticatedUserId, saasHttpError } from "@/modules/saas/presentation/http";

export async function GET() { try { return NextResponse.json(await getSettings(await authenticatedUserId())); } catch (error) { return saasHttpError(error); } }
export async function PATCH(request: Request) { try { return NextResponse.json(await updateSettings(await authenticatedUserId(), await request.json())); } catch (error) { return saasHttpError(error); } }
