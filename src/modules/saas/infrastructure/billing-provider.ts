import { z } from "zod";
import { serverEnvironment } from "@/platform/environment/server";
import { logger } from "@/platform/logging/logger";
import type { PlanState } from "../domain/subscription";

export type BillingTransition = { status: PlanState; currentPeriodEndsAt?: Date | null; graceEndsAt?: Date | null };
export type BillingCustomerInput = { referenceId: string; email: string; name: string };
export type RecurringPlanInput = { referenceId: string; customerId: string; amount: number; returnUrl: string };
export type RecurringPlanResult = { providerPlanId: string; checkoutUrl: string | null };

export class BillingProviderError extends Error {
  constructor(readonly code: "AUTH" | "RATE_LIMITED" | "UNAVAILABLE" | "INVALID_RESPONSE" | "REJECTED") {
    super("The billing service could not complete this request.");
    this.name = "BillingProviderError";
  }
}

export interface BillingProvider {
  readonly id: "manual" | "mock" | "xendit";
  validateTransition(input: BillingTransition): BillingTransition;
  createCustomer?(input: BillingCustomerInput, idempotencyKey: string): Promise<string>;
  createRecurringPlan?(input: RecurringPlanInput, idempotencyKey: string): Promise<RecurringPlanResult>;
  deactivatePlan?(providerPlanId: string): Promise<void>;
}

export class ManualPilotBillingProvider implements BillingProvider {
  readonly id = "manual" as const;
  validateTransition(input: BillingTransition) { return input; }
}

export class MockBillingProvider implements BillingProvider {
  readonly id = "mock" as const;
  validateTransition(input: BillingTransition) { return input; }
  async createCustomer(input: BillingCustomerInput) { return `mock_customer_${input.referenceId}`; }
  async createRecurringPlan(input: RecurringPlanInput) { return { providerPlanId: `mock_session_${input.referenceId}`, checkoutUrl: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}mock=1` }; }
  async deactivatePlan() { /* deterministic no-op */ }
}

const customerResponse = z.object({ id: z.string().min(1) });
const subscriptionSessionResponse = z.object({
  payment_session_id: z.string().min(1),
  payment_link_url: z.string().url(),
}).passthrough();
const providerErrorResponse = z.object({ error_code: z.string().optional() }).passthrough();

function xenditCustomerName(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
  return normalized || "Tindahan Owner";
}

function nextMonthlyAnchor(now = new Date()) {
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    Math.min(now.getUTCDate(), 28),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
  )).toISOString();
}

export class XenditBillingProvider implements BillingProvider {
  readonly id = "xendit" as const;
  constructor(private readonly secretKey = serverEnvironment.XENDIT_SECRET_KEY!, private readonly request: typeof fetch = fetch) {}
  validateTransition(input: BillingTransition) { return input; }

  private async send(path: string, init: RequestInit, options: { apiVersion?: string; idempotencyKey?: string } = {}) {
    const response = await this.request(`https://api.xendit.co${path}`, {
      ...init,
      headers: {
        authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString("base64")}`,
        "content-type": "application/json",
        ...(options.apiVersion ? { "api-version": options.apiVersion } : {}),
        ...(options.idempotencyKey ? { "idempotency-key": options.idempotencyKey.slice(0, 100) } : {}),
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(15_000),
    }).catch(() => { throw new BillingProviderError("UNAVAILABLE"); });

    if (response.ok) return response.json() as Promise<unknown>;

    let providerCode: string | undefined;
    try {
      const parsed = providerErrorResponse.safeParse(await response.clone().json());
      providerCode = parsed.success ? parsed.data.error_code : undefined;
    } catch {
      providerCode = undefined;
    }
    logger.error("billing_provider_failed", { provider: "xendit", operation: path, status: response.status, providerCode });

    if (response.status === 401 || response.status === 403) throw new BillingProviderError("AUTH");
    if (response.status === 429) throw new BillingProviderError("RATE_LIMITED");
    if (response.status >= 500) throw new BillingProviderError("UNAVAILABLE");
    throw new BillingProviderError("REJECTED");
  }

  async createCustomer(input: BillingCustomerInput, idempotencyKey: string) {
    const raw = await this.send("/customers", {
      method: "POST",
      body: JSON.stringify({
        reference_id: input.referenceId,
        type: "INDIVIDUAL",
        individual_detail: { given_names: xenditCustomerName(input.name) },
        email: input.email,
      }),
    }, { apiVersion: "2020-10-31", idempotencyKey });
    const parsed = customerResponse.safeParse(raw);
    if (!parsed.success) throw new BillingProviderError("INVALID_RESPONSE");
    return parsed.data.id;
  }

  // The application service keeps this provider-neutral method name, but the
  // Xendit implementation intentionally starts with a hosted SUBSCRIPTION
  // Payment Session. New Tindahan customers do not have a reusable payment
  // token yet, so direct recurring-plan creation is not the correct entry point.
  async createRecurringPlan(input: RecurringPlanInput) {
    const raw = await this.send("/sessions", {
      method: "POST",
      body: JSON.stringify({
        reference_id: input.referenceId,
        session_type: "SUBSCRIPTION",
        mode: "PAYMENT_LINK",
        amount: input.amount,
        currency: "PHP",
        country: "PH",
        customer_id: input.customerId,
        locale: "en",
        description: "Tindahan Standard monthly subscription",
        notification_channels: ["EMAIL"],
        subscription: {
          schedule: {
            interval: "MONTH",
            interval_count: 1,
            anchor_date: nextMonthlyAnchor(),
            retry_interval: "DAY",
            retry_interval_count: 1,
            total_retry: 3,
            failed_attempt_notifications: [1, 2, 3],
          },
          failed_cycle_action: "RESUME",
          payment_link_for_failed_attempt: true,
        },
        success_return_url: input.returnUrl,
        cancel_return_url: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}canceled=1`,
      }),
    });
    const parsed = subscriptionSessionResponse.safeParse(raw);
    if (!parsed.success) throw new BillingProviderError("INVALID_RESPONSE");
    return { providerPlanId: parsed.data.payment_session_id, checkoutUrl: parsed.data.payment_link_url };
  }

  async deactivatePlan(providerPlanId: string) {
    await this.send(`/recurring/plans/${encodeURIComponent(providerPlanId)}/deactivate`, { method: "POST", body: "{}" }, { apiVersion: "2026-01-01" });
  }
}

let cached: BillingProvider | undefined;
export function billingProvider(): BillingProvider {
  cached ??= serverEnvironment.BILLING_PROVIDER === "xendit" ? new XenditBillingProvider() : serverEnvironment.BILLING_PROVIDER === "mock" ? new MockBillingProvider() : new ManualPilotBillingProvider();
  return cached;
}
