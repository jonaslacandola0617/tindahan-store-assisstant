import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createEmailVerificationToken } from "@/modules/identity/application/email-verification";
import { registerOwnerStore } from "@/modules/identity/application/register-owner-store";
import { accountVerificationEmail, deliverEmail } from "@/modules/saas/application/transactional-email";
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
    let verificationEmailStatus: "SENT" | "FAILED" | "ALREADY_VERIFIED" = "FAILED";
    try {
      const verification = await createEmailVerificationToken(result.user.id);
      if (verification.alreadyVerified) {
        verificationEmailStatus = "ALREADY_VERIFIED";
      } else {
        const baseUrl = (serverEnvironment.APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
        const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(verification.token)}`;
        const delivery = await deliverEmail({
          storeId: result.store.id,
          userId: result.user.id,
          kind: "ACCOUNT_EMAIL_VERIFICATION",
          recipient: result.user.email,
          idempotencyKey: `account-email-verification-${result.user.id}-${verification.expires.getTime()}`,
          email: accountVerificationEmail(result.user.name || "there", verificationUrl),
        });
        verificationEmailStatus = delivery.status;
      }
    } catch {
      // Account creation is durable even if transactional email is temporarily unavailable.
      verificationEmailStatus = "FAILED";
    }
    return NextResponse.json({ ...result, verificationEmailStatus }, { status: 201 });
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
