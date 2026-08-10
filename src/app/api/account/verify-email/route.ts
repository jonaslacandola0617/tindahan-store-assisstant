import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { createEmailVerificationToken } from "@/modules/identity/application/email-verification";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { accountVerificationEmail, deliverEmail } from "@/modules/saas/application/transactional-email";
import { resolveStoreContext } from "@/modules/stores/application/store-context";
import { serverEnvironment } from "@/platform/environment/server";
import { requestRateLimit } from "@/platform/security/request-guard";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const limited = await requestRateLimit(request, "email-verification-resend", 4, 60 * 60_000);
  if (limited) return limited;

  const context = await resolveStoreContext(session.user.id);
  if (!context) return NextResponse.json({ error: "Your store could not be found." }, { status: 404 });

  const verification = await createEmailVerificationToken(session.user.id);
  if (verification.alreadyVerified) return NextResponse.json({ status: "ALREADY_VERIFIED" });

  const baseUrl = (serverEnvironment.APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(verification.token)}`;
  const delivery = await deliverEmail({
    storeId: context.store.id,
    userId: verification.user.id,
    kind: "ACCOUNT_EMAIL_VERIFICATION",
    recipient: verification.user.email,
    idempotencyKey: `account-email-verification-${verification.user.id}-${verification.expires.getTime()}`,
    email: accountVerificationEmail(verification.user.name || "there", verificationUrl),
  });

  return NextResponse.json({ status: delivery.status });
}
