import { NextRequest, NextResponse } from "next/server";
import { initializeReceiptUpload, listReceipts } from "@/modules/receipts/application/receipt-service";
import { receiptHttpError, receiptUserId } from "@/modules/receipts/presentation/http";

export async function GET(request: NextRequest) { try { return NextResponse.json(await listReceipts(await receiptUserId(), { status: request.nextUrl.searchParams.get("status") ?? undefined, cursor: request.nextUrl.searchParams.get("cursor") ?? undefined })); } catch (error) { return receiptHttpError(error); } }
export async function POST(request: NextRequest) { try { return NextResponse.json(await initializeReceiptUpload(await receiptUserId(), request.nextUrl.origin, await request.json()), { status: 201 }); } catch (error) { return receiptHttpError(error); } }

