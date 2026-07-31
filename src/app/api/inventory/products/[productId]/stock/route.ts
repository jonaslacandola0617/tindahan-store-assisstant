import { NextResponse } from "next/server";
import { addInventory, adjustInventory } from "@/modules/inventory/application/inventory-service";
import { authenticatedUserId, inventoryHttpError } from "@/modules/inventory/presentation/http";
type Context = { params: Promise<{ productId: string }> };
export async function POST(request: Request, { params }: Context) { try { const body = await request.json(); const result = body.action === "adjust" ? await adjustInventory(await authenticatedUserId(), (await params).productId, body) : await addInventory(await authenticatedUserId(), (await params).productId, body); return NextResponse.json(result, { status: 201 }); } catch (error) { return inventoryHttpError(error); } }
