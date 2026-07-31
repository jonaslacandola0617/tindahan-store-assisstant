import { NextResponse } from "next/server";
import { archiveProduct, readProduct, updateProduct } from "@/modules/inventory/application/inventory-service";
import { authenticatedUserId, inventoryHttpError } from "@/modules/inventory/presentation/http";
type Context = { params: Promise<{ productId: string }> };
export async function GET(_: Request, { params }: Context) { try { return NextResponse.json(await readProduct(await authenticatedUserId(), (await params).productId)); } catch (error) { return inventoryHttpError(error); } }
export async function PATCH(request: Request, { params }: Context) { try { return NextResponse.json(await updateProduct(await authenticatedUserId(), (await params).productId, await request.json())); } catch (error) { return inventoryHttpError(error); } }
export async function DELETE(_: Request, { params }: Context) { try { return NextResponse.json(await archiveProduct(await authenticatedUserId(), (await params).productId)); } catch (error) { return inventoryHttpError(error); } }
