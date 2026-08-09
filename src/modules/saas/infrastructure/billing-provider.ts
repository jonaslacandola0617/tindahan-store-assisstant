import { z } from "zod";
import { serverEnvironment } from "@/platform/environment/server";
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
  async createRecurringPlan(input: RecurringPlanInput) { return { providerPlanId: `mock_plan_${input.referenceId}`, checkoutUrl: `${input.returnUrl}${input.returnUrl.includes("?") ? "&" : "?"}mock=1` }; }
  async deactivatePlan() { /* deterministic no-op */ }
}

const customerResponse = z.object({ id: z.string().min(1) });
const recurringPlanResponse = z.object({
  id: z.string().min(1),
  actions: z.array(z.object({ url: z.string().url(), action: z.string().optional(), method: z.string().optional() }).passthrough()).optional(),
}).passthrough();

export class XenditBillingProvider implements BillingProvider {
  readonly id = "xendit" as const;
  constructor(private readonly secretKey = serverEnvironment.XENDIT_SECRET_KEY!, private readonly request: typeof fetch = fetch) {}
  validateTransition(input: BillingTransition) { return input; }

  private async send(path: string, init: RequestInit, apiVersion: string, idempotencyKey?: string) {
    const response = await this.request(`https://api.xendit.co${path}`, {
      ...init,
      headers: {
        authorization: `Basic ${Buffer.from(`${this.secretKey}:`).toString("base64")}`,
        "content-type": "application/json",
        "api-version": apiVersion,
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey.slice(0, 100) } : {}),
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(15_000),
    }).catch(() => { throw new BillingProviderError("UNAVAILABLE"); });
    if (response.ok) return response.json() as Promise<unknown>;
    if (response.status === 401 || response.status === 403) throw new BillingProviderError("AUTH");
    if (response.status === 429) throw new BillingProviderError("RATE_LIMITED");
    if (response.status >= 500) throw new BillingProviderError("UNAVAILABLE");
    throw new BillingProviderError("REJECTED");
  }

  async createCustomer(input: BillingCustomerInput, idempotencyKey: string) {
    const raw = await this.send("/customers", { method: "POST", body: JSON.stringify({ reference_id: input.referenceId, type: "INDIVIDUAL", individual_detail: { given_names: input.name }, email: input.email }) }, "2020-10-31", idempotencyKey);
    const parsed = customerResponse.safeParse(raw);
    if (!parsed.success) throw new BillingProviderError("INVALID_RESPONSE");
    return parsed.data.id;
  }

  async createRecurringPlan(input: RecurringPlanInput, idempotencyKey: string) {
    const raw = await this.send("/recurring/plans", { method: "POST", body: JSON.stringify({
      reference_id: input.referenceId,
      customer_id: input.customerId,
      currency: "PHP",
      amount: input.amount,
      schedule: { reference_id: `${input.referenceId}-monthly`, interval: "MONTH", interval_count: 1 },
      immediate_action_type: "FULL_AMOUNT",
      notification_config: { recurring_created: ["EMAIL"], recurring_succeeded: ["EMAIL"], recurring_failed: ["EMAIL"] },
      failed_cycle_action: "RESUME",
      metadata: { application: "tindahan" },
      success_return_url: input.returnUrl,
      failure_return_url: input.returnUrl,
    }) }, "2026-01-01", idempotencyKey);
    const parsed = recurringPlanResponse.safeParse(raw);
    if (!parsed.success) throw new BillingProviderError("INVALID_RESPONSE");
    const checkout = parsed.data.actions?.find(action => action.method?.toUpperCase() === "GET" || action.action?.toUpperCase().includes("AUTH")) ?? parsed.data.actions?.[0];
    return { providerPlanId: parsed.data.id, checkoutUrl: checkout?.url ?? null };
  }

  async deactivatePlan(providerPlanId: string) {
    await this.send(`/recurring/plans/${encodeURIComponent(providerPlanId)}/deactivate`, { method: "POST", body: "{}" }, "2026-01-01");
  }
}

let cached: BillingProvider | undefined;
export function billingProvider(): BillingProvider {
  cached ??= serverEnvironment.BILLING_PROVIDER === "xendit" ? new XenditBillingProvider() : serverEnvironment.BILLING_PROVIDER === "mock" ? new MockBillingProvider() : new ManualPilotBillingProvider();
  return cached;
}
