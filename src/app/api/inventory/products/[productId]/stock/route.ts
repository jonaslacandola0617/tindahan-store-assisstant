import { after, NextResponse } from "next/server";
import { addInventory, adjustInventory } from "@/modules/inventory/application/inventory-service";
import { sendStockAlertForMovement } from "@/modules/operating-view/application/operational-email";
import { authenticatedUserId, inventoryHttpError } from "@/modules/inventory/presentation/http";

type Context = { params: Promise<{ productId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const body = await request.json();
    const userId = await authenticatedUserId();
    const productId = (await params).productId;
    if (body.action === "adjust") {
      const result = await adjustInventory(userId, productId, body);
      after(async () => {
        await sendStockAlertForMovement(userId, result.movementId);
      });
      return NextResponse.json(result, { status: 201 });
    }
    const result = await addInventory(userId, productId, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return inventoryHttpError(error);
  }
}
