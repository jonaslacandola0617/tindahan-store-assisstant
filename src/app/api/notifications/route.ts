import { NextRequest, NextResponse } from "next/server";
import { listNotifications, markNotificationRead } from "@/modules/operating-view/application/operating-view-service";
import { operatingViewHttpError, operatingViewUserId } from "@/modules/operating-view/presentation/http";

export async function GET() {
  try { return NextResponse.json(await listNotifications(await operatingViewUserId())); }
  catch (error) { return operatingViewHttpError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { notificationId?: string };
    return NextResponse.json(await markNotificationRead(await operatingViewUserId(), body.notificationId));
  } catch (error) { return operatingViewHttpError(error); }
}
