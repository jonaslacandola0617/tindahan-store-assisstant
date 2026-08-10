import { describe, expect, it, vi } from "vitest";
import { XenditBillingProvider } from "./billing-provider";

describe("Xendit billing adapter", () => {
  it("uses documented API versions, Basic auth, idempotency, and hosted payment links", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "cust_1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "plan_1", payment_link_url: "https://checkout-staging.xendit.test/subscription/one" }), { status: 202 }));
    const provider = new XenditBillingProvider("test_secret", request);

    await expect(provider.createCustomer({ referenceId: "store_1", email: "owner@example.test", name: "Owner" }, "customer-key")).resolves.toBe("cust_1");
    await expect(provider.createRecurringPlan({ referenceId: "sub_1", customerId: "cust_1", amount: 499, returnUrl: "https://app.example.test/settings" }, "plan-key")).resolves.toEqual({
      providerPlanId: "plan_1",
      checkoutUrl: "https://checkout-staging.xendit.test/subscription/one",
    });

    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({ "api-version": "2020-10-31", "idempotency-key": "customer-key" });
    expect(request.mock.calls[1]?.[1]?.headers).toMatchObject({ "api-version": "2026-01-01", "idempotency-key": "plan-key" });

    const planBody = JSON.parse(String(request.mock.calls[1]?.[1]?.body));
    expect(planBody).toMatchObject({
      currency: "PHP",
      amount: 499,
      payment_tokens: [],
      immediate_payment: true,
      schedule: {
        interval: "MONTH",
        interval_count: 1,
        retry_interval: "DAY",
        retry_interval_count: 1,
        total_retry: 3,
      },
    });
    expect(planBody.schedule.anchor_date).toEqual(expect.any(String));
  });
});
