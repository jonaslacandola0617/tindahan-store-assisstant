import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serverEnvironment } from "@/platform/environment/server";
import { markBillingWebhookFailed, processXenditWebhook } from "@/modules/saas/application/billing-service";
import { logger } from "@/platform/logging/logger";

function secureEqual(received: string | null, expected: string) {
  if (!received) return false; const left = Buffer.from(received); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
export async function POST(request: Request) {
  const token = request.headers.get("x-callback-token");
  if (!secureEqual(token, serverEnvironment.XENDIT_WEBHOOK_TOKEN ?? "")) return NextResponse.json({ received: false }, { status: 401 });
  const raw = await request.text();
  let eventId = "";
  try {
    const payload = JSON.parse(raw) as { event?: string; data?: { id?: string } };
    eventId = request.headers.get("webhook-id") ?? createHash("sha256").update(`${payload.event ?? "unknown"}:${payload.data?.id ?? ""}:${raw}`).digest("hex");
    const result = await processXenditWebhook(payload, eventId);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    if (eventId) await markBillingWebhookFailed(eventId).catch(() => undefined);
    logger.error("billing_webhook_failed", { provider: "xendit", error: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
