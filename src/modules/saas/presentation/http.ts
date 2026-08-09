import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { SaasError } from "../application/errors";

export async function authenticatedUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new SaasError("UNAUTHENTICATED", "Sign in to continue.", 401);
  return session.user.id;
}

export function saasHttpError(error: unknown) {
  if (error instanceof SaasError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "Check the highlighted details.", code: "VALIDATION", fields: error.flatten().fieldErrors }, { status: 400 });
  console.error("SaaS settings request failed", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({ error: "We couldn't complete that request. Nothing was changed.", code: "UNEXPECTED" }, { status: 500 });
}
