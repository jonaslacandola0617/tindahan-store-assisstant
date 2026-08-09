import { NextResponse } from "next/server";
import { createProductFromReceiptLine } from "@/modules/receipts/application/receipt-service";
import { receiptHttpError, receiptUserId } from "@/modules/receipts/presentation/http";
export async function POST(request: Request, { params }: { params: Promise<{ receiptId: string; lineId: string }> }) { try { const { receiptId, lineId } = await params; return NextResponse.json(await createProductFromReceiptLine(await receiptUserId(), receiptId, lineId, await request.json()), { status: 201 }); } catch (error) { return receiptHttpError(error); } }

