import { NextResponse } from "next/server";
import { assignBarcode, generateBarcode } from "@/modules/inventory/application/inventory-service";
import { authenticatedUserId, inventoryHttpError } from "@/modules/inventory/presentation/http";
type Context = { params: Promise<{ productId: string }> };
export async function POST(request: Request, { params }: Context) { try { const body = await request.json(); const userId = await authenticatedUserId(); const productId = (await params).productId; const result = body.action === "assign" ? await assignBarcode(userId, productId, body) : await generateBarcode(userId, productId, body.action === "replace"); return NextResponse.json(result, { status: 201 }); } catch (error) { return inventoryHttpError(error); } }
