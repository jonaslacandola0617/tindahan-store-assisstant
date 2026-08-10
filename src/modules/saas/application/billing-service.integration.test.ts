import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { database } from "@/platform/persistence/prisma";
import { processXenditWebhook } from "./billing-service";

const databaseTests = process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE ? describe : describe.skip;
databaseTests("billing webhook integration", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let storeId = "";
  let ownerId = "";
  let subscriptionId = "";

  beforeAll(async () => {
    const owner = await database().user.create({ data: { email: `billing-${suffix}@example.test`, name: "Billing Owner" } });
    ownerId = owner.id;
    const store = await database().store.create({
      data: {
        name: "Billing Store",
        memberships: { create: { userId: owner.id, role: "OWNER" } },
        preference: { create: {} },
        subscription: {
          create: {
            provider: "xendit",
            externalSubscriptionId: `ps-${suffix}`,
            plan: "TRIAL",
            status: "TRIALING",
          },
        },
      },
      include: { subscription: true },
    });
    storeId = store.id;
    subscriptionId = store.subscription!.id;
  });

  afterAll(async () => {
    if (storeId) {
      await database().emailDelivery.deleteMany({ where: { storeId } });
      await database().billingStatement.deleteMany({ where: { storeId } });
      await database().billingTransaction.deleteMany({ where: { storeId } });
      await database().billingWebhookEvent.deleteMany({ where: { storeId } });
      await database().auditEvent.deleteMany({ where: { storeId } });
      await database().store.delete({ where: { id: storeId } });
    }
    if (ownerId) await database().user.deleteMany({ where: { id: ownerId } });
  });

  it("reconciles a hosted payment session to the real recurring plan and applies lifecycle events once", async () => {
    const planId = `plan-${suffix}`;
    const referenceId = `sub_${subscriptionId}_abcdef123456`;

    await expect(processXenditWebhook({
      event: "payment_session.completed",
      data: { payment_session_id: `ps-${suffix}`, reference_id: referenceId, created_at: "2026-08-09T00:50:00Z" },
    }, `event-session-${suffix}`)).resolves.toEqual({ ignored: true });

    await expect(processXenditWebhook({
      event: "recurring.plan.activated",
      data: { id: planId, reference_id: referenceId, created_at: "2026-08-09T01:00:00Z" },
    }, `event-active-${suffix}`)).resolves.toEqual({ processed: true });

    expect(await database().storeSubscription.findUnique({
      where: { id: subscriptionId },
      select: { plan: true, status: true, externalSubscriptionId: true },
    })).toEqual({ plan: "STANDARD", status: "ACTIVE", externalSubscriptionId: planId });

    await expect(processXenditWebhook({
      event: "recurring.cycle.succeeded",
      data: {
        id: `cycle-${suffix}`,
        plan_id: planId,
        reference_id: referenceId,
        amount: 499,
        currency: "PHP",
        created_at: "2026-08-09T02:00:00Z",
        cycle_start: "2026-08-09T00:00:00Z",
        cycle_end: "2026-09-09T00:00:00Z",
      },
    }, `event-paid-${suffix}`)).resolves.toEqual({ processed: true });

    await expect(processXenditWebhook({
      event: "recurring.cycle.succeeded",
      data: { id: `cycle-${suffix}`, plan_id: planId, amount: 499 },
    }, `event-paid-${suffix}`)).resolves.toEqual({ duplicate: true });

    await expect(processXenditWebhook({
      event: "recurring.plan.inactivated",
      data: { id: planId, reference_id: referenceId, created_at: "2026-08-09T00:30:00Z" },
    }, `event-old-${suffix}`)).resolves.toEqual({ ignored: true });

    expect(await database().billingTransaction.count({ where: { storeId } })).toBe(1);
    expect(await database().billingStatement.count({ where: { storeId } })).toBe(1);

    const concurrent = await Promise.all([
      processXenditWebhook({
        event: "recurring.cycle.retrying",
        data: { id: `retry-${suffix}`, plan_id: planId, amount: 499, created_at: "2026-08-09T03:00:00Z" },
      }, `event-retry-${suffix}`),
      processXenditWebhook({
        event: "recurring.cycle.retrying",
        data: { id: `retry-${suffix}`, plan_id: planId, amount: 499, created_at: "2026-08-09T03:00:00Z" },
      }, `event-retry-${suffix}`),
    ]);
    expect(concurrent.filter(result => "processed" in result)).toHaveLength(1);
    expect(concurrent.filter(result => "duplicate" in result)).toHaveLength(1);
  });
});
