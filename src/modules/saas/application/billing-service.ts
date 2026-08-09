import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { database } from "@/platform/persistence/prisma";
import { serverEnvironment } from "@/platform/environment/server";
import { resolveStoreContext } from "@/modules/stores/application/store-context";
import { calculateBillingAmounts, statementNumber } from "../domain/billing";
import { billingProvider } from "../infrastructure/billing-provider";
import { billingStatusEmail, deliverEmail } from "./transactional-email";
import { SaasError } from "./errors";

const webhookData = z.object({
  id: z.string().optional(), reference_id: z.string().optional(), recurring_plan_id: z.string().optional(), plan_id: z.string().optional(),
  amount: z.coerce.number().nonnegative().optional(), currency: z.string().optional(),
  created: z.string().optional(), created_at: z.string().optional(), scheduled_timestamp: z.string().optional(),
  cycle_start: z.string().optional(), cycle_end: z.string().optional(),
}).passthrough();
const webhookSchema = z.object({ event: z.string().min(1), data: webhookData }).passthrough();
export type XenditWebhook = z.infer<typeof webhookSchema>;

async function ownerContext(userId: string) {
  const context = await resolveStoreContext(userId);
  if (!context || context.role !== "OWNER") throw new SaasError("OWNER_REQUIRED", "Only the store owner can manage the plan.", 403);
  return context;
}
function taxConfiguration() { return { enabled: serverEnvironment.BILLING_TAX_ENABLED === "true", rateBasisPoints: serverEnvironment.BILLING_TAX_RATE_BPS, label: serverEnvironment.BILLING_TAX_LABEL }; }

export async function startStandardCheckout(userId: string) {
  const { store } = await ownerContext(userId); const provider = billingProvider();
  if (!provider.createCustomer || !provider.createRecurringPlan || !serverEnvironment.BILLING_STANDARD_MONTHLY_AMOUNT_PHP) throw new SaasError("BILLING_UNAVAILABLE", "Online plan setup is not available yet.", 409);
  const user = await database().user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } });
  let customer = await database().billingCustomer.findUnique({ where: { storeId: store.id } });
  if (!customer || customer.provider !== provider.id) {
    const providerCustomerId = await provider.createCustomer({ referenceId: `store-${store.id}`, email: user.email, name: user.name || store.name }, `customer-${store.id}-${provider.id}`);
    customer = await database().billingCustomer.upsert({ where: { storeId: store.id }, update: { provider: provider.id, providerCustomerId, billingName: user.name || store.name, billingEmail: user.email }, create: { storeId: store.id, provider: provider.id, providerCustomerId, billingName: user.name || store.name, billingEmail: user.email } });
  }
  const subscription = await database().storeSubscription.upsert({ where: { storeId: store.id }, update: {}, create: { storeId: store.id, plan: "TRIAL", status: "TRIALING" } });
  if (subscription.status === "ACTIVE" && subscription.plan === "STANDARD") throw new SaasError("ALREADY_ACTIVE", "Your Standard plan is already active.", 409);
  const referenceId = `subscription-${subscription.id}-${randomUUID()}`;
  const tax = calculateBillingAmounts(serverEnvironment.BILLING_STANDARD_MONTHLY_AMOUNT_PHP * 100, taxConfiguration());
  const result = await provider.createRecurringPlan({ referenceId, customerId: customer.providerCustomerId, amount: tax.totalCentavos / 100, returnUrl: `${serverEnvironment.APP_URL}/settings?billing=returned` }, `plan-${referenceId}`);
  await database().$transaction(async tx => {
    await tx.storeSubscription.update({ where: { id: subscription.id }, data: { provider: provider.id, externalCustomerId: customer!.providerCustomerId, externalSubscriptionId: result.providerPlanId } });
    await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "BILLING_CHECKOUT_STARTED", entityType: "StoreSubscription", entityId: subscription.id, correlationId: randomUUID(), after: { provider: provider.id, plan: "STANDARD" } } });
  });
  if (!result.checkoutUrl) throw new SaasError("BILLING_UNAVAILABLE", "The payment page is not available. Try again.", 503);
  return { checkoutUrl: result.checkoutUrl };
}

export async function cancelSubscription(userId: string) {
  const { store } = await ownerContext(userId); const subscription = await database().storeSubscription.findUnique({ where: { storeId: store.id } });
  if (!subscription?.externalSubscriptionId || subscription.status === "CANCELED") throw new SaasError("NOT_ACTIVE", "There is no active paid plan to cancel.", 409);
  const provider = billingProvider(); if (!provider.deactivatePlan) throw new SaasError("BILLING_UNAVAILABLE", "Online cancellation is not available for this plan.", 409);
  await provider.deactivatePlan(subscription.externalSubscriptionId);
  await database().auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "BILLING_CANCELLATION_REQUESTED", entityType: "StoreSubscription", entityId: subscription.id, correlationId: randomUUID() } });
  return { ok: true, message: "Cancellation requested. The plan will update after payment confirmation." };
}

export async function getBillingHistory(userId: string) {
  const context = await resolveStoreContext(userId); if (!context) throw new SaasError("FORBIDDEN", "You do not have access to a store.", 403);
  const { store, role } = context;
  if (role !== "OWNER") return { role, subscription: null, transactions: [], statements: [] };
  const [subscription, transactions, statements] = await Promise.all([
    database().storeSubscription.findUnique({ where: { storeId: store.id } }),
    database().billingTransaction.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    database().billingStatement.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return { role, subscription, transactions: transactions.map(item => ({ ...item, amount: item.amount.toString() })), statements: statements.map(item => ({ ...item, subtotal: item.subtotal.toString(), tax: item.tax.toString(), total: item.total.toString() })) };
}

export async function getBillingStatement(userId: string, statementId: string) {
  const { store } = await ownerContext(userId);
  const statement = await database().billingStatement.findFirst({ where: { id: statementId, storeId: store.id }, include: { store: { select: { name: true, address: true } } } });
  if (!statement) throw new SaasError("NOT_FOUND", "Statement not found.", 404);
  return { ...statement, subtotal: statement.subtotal.toString(), tax: statement.tax.toString(), total: statement.total.toString() };
}

function date(value: unknown) { const parsed = typeof value === "string" ? new Date(value) : null; return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null; }
async function notifyOwner(storeId: string, kind: "activated" | "failed" | "canceled" | "changed", eventId: string) {
  const store = await database().store.findUnique({ where: { id: storeId }, select: { name: true, memberships: { where: { role: "OWNER", status: "ACTIVE" }, take: 1, select: { userId: true, user: { select: { email: true } } } } } });
  const owner = store?.memberships[0]; if (!store || !owner) return;
  await deliverEmail({ storeId, userId: owner.userId, kind: `BILLING_${kind.toUpperCase()}`, recipient: owner.user.email, idempotencyKey: `billing-${eventId}-${kind}`, email: billingStatusEmail(store.name, kind) });
}

export async function processXenditWebhook(raw: unknown, providerEventId: string) {
  const payload = webhookSchema.parse(raw); const payloadHash = createHash("sha256").update(JSON.stringify(raw)).digest("hex");
  const existing = await database().billingWebhookEvent.findUnique({ where: { provider_providerEventId: { provider: "xendit", providerEventId } } });
  if (existing?.status === "PROCESSED" || existing?.status === "IGNORED") return { duplicate: true };
  await database().billingWebhookEvent.upsert({ where: { provider_providerEventId: { provider: "xendit", providerEventId } }, update: {}, create: { provider: "xendit", providerEventId, eventType: payload.event, payloadHash } });
  const staleClaim = new Date(Date.now() - 5 * 60_000);
  const claim = await database().billingWebhookEvent.updateMany({ where: { provider: "xendit", providerEventId, OR: [{ status: "FAILED" }, { status: "RECEIVED", errorCode: null }, { status: "RECEIVED", errorCode: "PROCESSING", receivedAt: { lt: staleClaim } }] }, data: { status: "RECEIVED", errorCode: "PROCESSING", receivedAt: new Date() } });
  if (claim.count !== 1) return { duplicate: true };
  const data = payload.data; const providerPlanId = data.recurring_plan_id ?? data.plan_id ?? (payload.event.startsWith("recurring.plan.") ? data.id : undefined);
  const subscription = providerPlanId ? await database().storeSubscription.findFirst({ where: { externalSubscriptionId: providerPlanId } }) : null;
  if (!subscription) { await database().billingWebhookEvent.update({ where: { provider_providerEventId: { provider: "xendit", providerEventId } }, data: { status: "IGNORED", errorCode: null, processedAt: new Date() } }); return { ignored: true }; }
  const providerCreatedAt = date(data.created_at ?? data.created ?? data.scheduled_timestamp);
  if (providerCreatedAt && subscription.lastProviderEventAt && providerCreatedAt < subscription.lastProviderEventAt) {
    await database().billingWebhookEvent.update({ where: { provider_providerEventId: { provider: "xendit", providerEventId } }, data: { storeId: subscription.storeId, status: "IGNORED", errorCode: null, providerCreatedAt, processedAt: new Date() } }); return { ignored: true };
  }
  const now = new Date(); let emailKind: "activated" | "failed" | "canceled" | "changed" | null = null;
  await database().$transaction(async tx => {
    const eventData = { storeId: subscription.storeId, providerCreatedAt, processedAt: now, status: "PROCESSED" as const, errorCode: null };
    if (payload.event === "recurring.plan.activated") { await tx.storeSubscription.update({ where: { id: subscription.id }, data: { plan: "STANDARD", status: "ACTIVE", lastProviderEventAt: providerCreatedAt ?? now, canceledAt: null } }); emailKind = "activated"; }
    else if (payload.event === "recurring.plan.inactivated") { await tx.storeSubscription.update({ where: { id: subscription.id }, data: { status: "CANCELED", canceledAt: now, lastProviderEventAt: providerCreatedAt ?? now } }); emailKind = "canceled"; }
    else if (payload.event === "recurring.cycle.retrying") { await tx.storeSubscription.update({ where: { id: subscription.id }, data: { status: "GRACE", graceEndsAt: new Date(now.getTime() + serverEnvironment.BILLING_GRACE_DAYS * 86_400_000), lastProviderEventAt: providerCreatedAt ?? now } }); emailKind = "failed"; }
    else if (payload.event === "recurring.cycle.failed") { const transactionReference = data.id ?? providerEventId; await tx.billingTransaction.upsert({ where: { provider_providerTransactionId: { provider: "xendit", providerTransactionId: transactionReference } }, update: { status: "FAILED" }, create: { storeId: subscription.storeId, subscriptionId: subscription.id, provider: "xendit", providerTransactionId: transactionReference, status: "FAILED", amount: data.amount ?? 0, currency: data.currency ?? "PHP", periodStartsAt: date(data.cycle_start), periodEndsAt: date(data.cycle_end) } }); await tx.storeSubscription.update({ where: { id: subscription.id }, data: { status: "RESTRICTED", lastProviderEventAt: providerCreatedAt ?? now } }); emailKind = "failed"; }
    else if (payload.event === "recurring.cycle.succeeded") {
      const transactionReference = data.id ?? providerEventId; const paidAt = providerCreatedAt ?? now; const amount = data.amount ?? serverEnvironment.BILLING_STANDARD_MONTHLY_AMOUNT_PHP ?? 0; const taxConfig = taxConfiguration(); const configured = calculateBillingAmounts((serverEnvironment.BILLING_STANDARD_MONTHLY_AMOUNT_PHP ?? amount) * 100, taxConfig); const amounts = configured.totalCentavos === Math.round(amount * 100) ? configured : calculateBillingAmounts(Math.round(amount * 100), { ...taxConfig, enabled: false });
      const transaction = await tx.billingTransaction.upsert({ where: { provider_providerTransactionId: { provider: "xendit", providerTransactionId: transactionReference } }, update: { status: "PAID", paidAt }, create: { storeId: subscription.storeId, subscriptionId: subscription.id, provider: "xendit", providerTransactionId: transactionReference, status: "PAID", amount, currency: data.currency ?? "PHP", periodStartsAt: date(data.cycle_start), periodEndsAt: date(data.cycle_end), paidAt } });
      await tx.billingStatement.upsert({ where: { transactionId: transaction.id }, update: { paymentStatus: "PAID", paidAt }, create: { statementNumber: statementNumber(transactionReference, paidAt), storeId: subscription.storeId, subscriptionId: subscription.id, transactionId: transaction.id, plan: "STANDARD", currency: data.currency ?? "PHP", subtotal: amounts.subtotalCentavos / 100, tax: amounts.taxCentavos / 100, total: amounts.totalCentavos / 100, lineItems: [{ description: "Tindahan Standard plan", quantity: 1, amount: amounts.subtotalCentavos / 100 }], taxSnapshot: { enabled: amounts.taxCentavos > 0, rateBasisPoints: taxConfig.rateBasisPoints, label: taxConfig.label, note: "Subscription statement only; no official tax-invoice claim is made." }, paymentStatus: "PAID", providerReference: transactionReference, periodStartsAt: date(data.cycle_start), periodEndsAt: date(data.cycle_end), paidAt } });
      await tx.storeSubscription.update({ where: { id: subscription.id }, data: { plan: "STANDARD", status: "ACTIVE", graceEndsAt: null, currentPeriodStartsAt: date(data.cycle_start), currentPeriodEndsAt: date(data.cycle_end), lastProviderEventAt: providerCreatedAt ?? now } }); emailKind = subscription.plan === "STANDARD" ? "activated" : "changed";
    } else { await tx.billingWebhookEvent.update({ where: { provider_providerEventId: { provider: "xendit", providerEventId } }, data: { ...eventData, status: "IGNORED" } }); return; }
    await tx.billingWebhookEvent.update({ where: { provider_providerEventId: { provider: "xendit", providerEventId } }, data: eventData });
    await tx.auditEvent.create({ data: { storeId: subscription.storeId, action: "BILLING_WEBHOOK_APPLIED", entityType: "StoreSubscription", entityId: subscription.id, correlationId: providerEventId, after: { event: payload.event, status: emailKind } } });
  });
  if (emailKind) await notifyOwner(subscription.storeId, emailKind, providerEventId);
  return { processed: true };
}

export async function markBillingWebhookFailed(providerEventId: string) {
  await database().billingWebhookEvent.updateMany({ where: { provider: "xendit", providerEventId, status: "RECEIVED" }, data: { status: "FAILED", errorCode: "PROCESSING_FAILED", processedAt: new Date() } });
}
