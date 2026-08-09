import { NextResponse } from "next/server";
import { saveReceiptLineReview } from "@/modules/receipts/application/receipt-service";
import { receiptHttpError, receiptUserId } from "@/modules/receipts/presentation/http";
export async function PATCH(request: Request, { params }: { params: Promise<{ receiptId: string; lineId: string }> }) { try { const { receiptId, lineId } = await params; return NextResponse.json(await saveReceiptLineReview(await receiptUserId(), receiptId, lineId, await request.json())); } catch (error) { return receiptHttpError(error); } }

