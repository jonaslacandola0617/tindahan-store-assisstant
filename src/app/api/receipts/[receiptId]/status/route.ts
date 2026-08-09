import { NextResponse } from "next/server";
import { receiptStatus } from "@/modules/receipts/application/receipt-service";
import { receiptHttpError, receiptUserId } from "@/modules/receipts/presentation/http";
export async function GET(_request: Request, { params }: { params: Promise<{ receiptId: string }> }) { try { return NextResponse.json(await receiptStatus(await receiptUserId(), (await params).receiptId)); } catch (error) { return receiptHttpError(error); } }

