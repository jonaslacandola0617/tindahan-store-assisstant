import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createStoreForOwner } from "@/modules/stores/application/create-store";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { serverEnvironment } from "@/platform/environment/server";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (serverEnvironment.demoMode) return NextResponse.json({ store: { id: "demo-store", name: "Aling Rosa's Store" } }, { status: 201 });
  try {
    const store = await createStoreForOwner(session.user.id, await request.json());
    return NextResponse.json({ store }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Check the store details." }, { status: 400 });
    throw error;
  }
}
