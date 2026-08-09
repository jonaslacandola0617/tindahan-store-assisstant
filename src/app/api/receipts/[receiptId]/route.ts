import { NextRequest, NextResponse } from "next/server";
import { discardReceiptUpload, readReceipt } from "@/modules/receipts/application/receipt-service";
import { receiptHttpError, receiptUserId } from "@/modules/receipts/presentation/http";
export async function GET(request: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) { try { return NextResponse.json(await readReceipt(await receiptUserId(), (await params).receiptId, request.nextUrl.origin)); } catch (error) { return receiptHttpError(error); } }
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ receiptId: string }> }) { try { return NextResponse.json(await discardReceiptUpload(await receiptUserId(), (await params).receiptId)); } catch (error) { return receiptHttpError(error); } }
