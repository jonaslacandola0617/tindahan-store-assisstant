import { NextResponse } from "next/server";
import { createProduct, searchProducts } from "@/modules/inventory/application/inventory-service";
import { authenticatedUserId, inventoryHttpError } from "@/modules/inventory/presentation/http";

export async function GET(request: Request) { try { const url = new URL(request.url); const result = await searchProducts(await authenticatedUserId(), { query: url.searchParams.get("q") ?? undefined, filter: url.searchParams.get("filter") ?? undefined, sort: url.searchParams.get("sort") ?? undefined, cursor: url.searchParams.get("cursor") ?? undefined }); return NextResponse.json(result); } catch (error) { return inventoryHttpError(error); } }
export async function POST(request: Request) { try { const result = await createProduct(await authenticatedUserId(), await request.json()); return NextResponse.json(result, { status: 201 }); } catch (error) { return inventoryHttpError(error); } }
