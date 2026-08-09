import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/modules/operating-view/application/operating-view-service";
import { operatingViewHttpError, operatingViewUserId } from "@/modules/operating-view/presentation/http";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await globalSearch(await operatingViewUserId(), request.nextUrl.searchParams.get("q") ?? ""));
  } catch (error) {
    return operatingViewHttpError(error);
  }
}
