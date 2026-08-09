import { NextResponse } from "next/server";
import { authenticatedUserId } from "@/modules/saas/presentation/http";
import { cancelSubscription } from "@/modules/saas/application/billing-service";
import { saasHttpError } from "@/modules/saas/presentation/http";
export async function POST() { try { return NextResponse.json(await cancelSubscription(await authenticatedUserId())); } catch (error) { return saasHttpError(error); } }
