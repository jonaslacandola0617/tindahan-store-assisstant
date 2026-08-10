import { after, NextResponse } from "next/server";
import { sendStockAlertsForUserSource } from "@/modules/operating-view/application/operational-email";
import { reverseReceipt } from "@/modules/receipts/application/receipt-service";
import { receiptHttpError, receiptUserId } from "@/modules/receipts/presentation/http";

export async function POST(request: Request, { params }: { params: Promise<{ receiptId: string }> }) {
  try {
    const userId = await receiptUserId();
    const receiptId = (await params).receiptId;
    const result = await reverseReceipt(userId, receiptId, await request.json());
    after(async () => {
      await sendStockAlertsForUserSource({
        userId,
        sourceType: "RECEIPT_REVERSAL",
        sourceId: receiptId,
        eventKey: `receipt-reversal:${receiptId}`,
      });
    });
    return NextResponse.json(result);
  } catch (error) {
    return receiptHttpError(error);
  }
}
