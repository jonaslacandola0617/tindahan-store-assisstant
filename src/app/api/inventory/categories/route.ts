import { NextResponse } from "next/server";
import { listCategories } from "@/modules/inventory/application/inventory-service";
import { authenticatedUserId, inventoryHttpError } from "@/modules/inventory/presentation/http";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q") ?? undefined;
    return NextResponse.json(await listCategories(await authenticatedUserId(), query));
  } catch (error) {
    return inventoryHttpError(error);
  }
}
