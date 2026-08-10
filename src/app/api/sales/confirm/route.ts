import { after, NextRequest, NextResponse } from "next/server";
import { sendStockAlertsForUserSource } from "@/modules/operating-view/application/operational-email";
import { confirmSale } from "@/modules/sales/application/sales-service";
import { salesHttpError, salesUserId } from "@/modules/sales/presentation/http";

export async function POST(request: NextRequest) {
  try {
    const userId = await salesUserId();
    const result = await confirmSale(userId, await request.json());
    after(() => sendStockAlertsForUserSource({
      userId,
      sourceType: "SALE",
      sourceId: result.saleId,
      eventKey: `sale:${result.saleId}`,
    }));
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return salesHttpError(error);
  }
}
