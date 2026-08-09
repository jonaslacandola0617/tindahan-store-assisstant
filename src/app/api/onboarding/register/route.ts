import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { registerOwnerStore } from "@/modules/identity/application/register-owner-store";
import { serverEnvironment } from "@/platform/environment/server";
import { requestRateLimit } from "@/platform/security/request-guard";

export async function POST(request: Request) {
  if (serverEnvironment.demoMode) {
    return NextResponse.json({ error: "Registration is disabled in demo mode." }, { status: 409 });
  }
  const limited = await requestRateLimit(request, "owner-store-registration", 10, 60 * 60_000);
  if (limited) return limited;

  try {
    const result = await registerOwnerStore(await request.json());
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Check the highlighted details." }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account already uses this email." }, { status: 409 });
    }
    throw error;
  }
}
