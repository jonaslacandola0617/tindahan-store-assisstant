import { NextResponse } from "next/server";
import { z } from "zod";
import { saveInventoryView } from "@/modules/inventory/application/inventory-service";
import { authenticatedUserId, inventoryHttpError } from "@/modules/inventory/presentation/http";
export async function PATCH(request: Request) { try { const { view } = z.object({ view: z.enum(["LIST", "GRID"]) }).parse(await request.json()); return NextResponse.json(await saveInventoryView(await authenticatedUserId(), view)); } catch (error) { return inventoryHttpError(error); } }
