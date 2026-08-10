import { describe, expect, it, vi } from "vitest";
import { XenditBillingProvider } from "./billing-provider";

describe("Xendit billing adapter", () => {
  it("creates a customer then starts a hosted subscription payment session", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "cust_1" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        payment_session_id: "ps_1",
        payment_link_url: "https://checkout-staging.xendit.test/session/one",
      }), { status: 201 }));
    const provider = new XenditBillingProvider("test_secret", request);

    await expect(provider.createCustomer({
      referenceId: "store_1",
      email: "owner@example.test",
      name: "Owner Dela Cruz!",
    }, "customer-key")).resolves.toBe("cust_1");

    await expect(provider.createRecurringPlan({
      referenceId: "sub_123_abcdef123456",
      customerId: "cust_1",
      amount: 499,
      returnUrl: "https://app.example.test/settings?billing=returned",
    }, "session-key")).resolves.toEqual({
      providerPlanId: "ps_1",
      checkoutUrl: "https://checkout-staging.xendit.test/session/one",
    });

    expect(request.mock.calls[0]?.[0]).toBe("https://api.xendit.co/customers");
    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({
      "api-version": "2020-10-31",
      "idempotency-key": "customer-key",
    });
    const customerBody = JSON.parse(String(request.mock.calls[0]?.[1]?.body));
    expect(customerBody.individual_detail.given_names).toBe("Owner Dela Cruz");

    expect(request.mock.calls[1]?.[0]).toBe("https://api.xendit.co/sessions");
    expect(request.mock.calls[1]?.[1]?.headers).not.toHaveProperty("api-version");
    expect(request.mock.calls[1]?.[1]?.headers).not.toHaveProperty("idempotency-key");

    const sessionBody = JSON.parse(String(request.mock.calls[1]?.[1]?.body));
    expect(sessionBody).toMatchObject({
      reference_id: "sub_123_abcdef123456",
      session_type: "SUBSCRIPTION",
      mode: "PAYMENT_LINK",
      customer_id: "cust_1",
      country: "PH",
      currency: "PHP",
      amount: 499,
      success_return_url: "https://app.example.test/settings?billing=returned",
      subscription: {
        schedule: {
          interval: "MONTH",
          interval_count: 1,
          retry_interval: "DAY",
          retry_interval_count: 1,
          total_retry: 3,
        },
        failed_cycle_action: "RESUME",
        payment_link_for_failed_attempt: true,
      },
    });
    expect(sessionBody.subscription.schedule.anchor_date).toEqual(expect.any(String));
    expect(sessionBody.cancel_return_url).toContain("canceled=1");
  });
});
