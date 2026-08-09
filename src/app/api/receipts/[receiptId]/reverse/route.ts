import { NextResponse } from "next/server";
import { reverseReceipt } from "@/modules/receipts/application/receipt-service";
import { receiptHttpError, receiptUserId } from "@/modules/receipts/presentation/http";
export async function POST(request: Request, { params }: { params: Promise<{ receiptId: string }> }) { try { return NextResponse.json(await reverseReceipt(await receiptUserId(), (await params).receiptId, await request.json())); } catch (error) { return receiptHttpError(error); } }

