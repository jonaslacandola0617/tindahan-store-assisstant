import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { InventoryError } from "../application/errors";

export async function authenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new InventoryError("UNAUTHENTICATED", "Sign in to continue.", 401);
  return session.user.id;
}

export function inventoryHttpError(error: unknown) {
  if (error instanceof InventoryError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "Check the information and try again.", code: "VALIDATION", fields: error.flatten().fieldErrors }, { status: 400 });
  console.error("Inventory request failed", error);
  return NextResponse.json({ error: "We couldn't complete that request. Nothing was changed. Try again.", code: "UNEXPECTED" }, { status: 500 });
}
