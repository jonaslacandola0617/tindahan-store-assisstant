import { NextResponse } from "next/server";
import { completeReceiptUpload } from "@/modules/receipts/application/receipt-service";
import { receiptHttpError, receiptUserId } from "@/modules/receipts/presentation/http";
export async function POST(_request: Request, { params }: { params: Promise<{ receiptId: string }> }) { try { return NextResponse.json(await completeReceiptUpload(await receiptUserId(), (await params).receiptId)); } catch (error) { return receiptHttpError(error); } }

