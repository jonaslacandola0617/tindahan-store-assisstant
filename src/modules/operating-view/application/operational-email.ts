import { database } from "@/platform/persistence/prisma";
import { serverEnvironment } from "@/platform/environment/server";
import { logger } from "@/platform/logging/logger";
import { resolveStoreContext } from "@/modules/stores/application/store-context";
import {
  dailyStoreSummaryEmail,
  deliverEmail,
  receiptStatusEmail,
  stockAttentionEmail,
  type DailyStoreSummary,
  type OperationalEmailLocale,
  type StockEmailItem,
} from "@/modules/saas/application/transactional-email";

export type StockTransition = "LOW" | "OUT" | null;

export function classifyStockTransition(previousQuantity: number, resultingQuantity: number, lowStockThreshold: number): StockTransition {
  if (resultingQuantity === 0 && previousQuantity > 0) return "OUT";
  if (resultingQuantity > 0 && resultingQuantity <= lowStockThreshold && previousQuantity > lowStockThreshold) return "LOW";
  return null;
}

function absoluteAppUrl(path: string) {
  const base = (serverEnvironment.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function unitLabel(sellingUnit: string, otherUnitRaw: string | null) {
  return (otherUnitRaw || sellingUnit).toLowerCase();
}

async function storeNotificationContext(storeId: string) {
  return database().store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      preference: { select: { lowStockEnabled: true, receiptNotifications: true, dailySummaryEnabled: true } },
      memberships: {
        where: { role: "OWNER", status: "ACTIVE" },
        select: { user: { select: { id: true, email: true, preferredLanguage: true } } },
      },
    },
  });
}

async function deliverStockItems(input: { storeId: string; eventKey: string; items: StockEmailItem[] }) {
  const context = await storeNotificationContext(input.storeId);
  if (!context || context.preference?.lowStockEnabled === false || !input.items.length) return { sent: 0, skipped: true };
  const items = [...input.items].sort((left, right) => Number(right.status === "OUT") - Number(left.status === "OUT") || left.name.localeCompare(right.name));
  const inventoryUrl = absoluteAppUrl(items.every(item => item.status === "OUT") ? "/inventory?filter=out" : "/inventory?filter=low");
  let sent = 0;
  for (const membership of context.memberships) {
    const owner = membership.user;
    const result = await deliverEmail({
      storeId: context.id,
      userId: owner.id,
      kind: "STOCK_ALERT",
      recipient: owner.email,
      idempotencyKey: `operational-stock:${owner.id}:${input.eventKey}`,
      email: stockAttentionEmail(context.name, items, inventoryUrl, owner.preferredLanguage as OperationalEmailLocale),
    });
    if (result.status === "SENT") sent += 1;
  }
  return { sent, skipped: false };
}

export async function sendStockAlertsForSource(input: { storeId: string; sourceType: string; sourceId: string; eventKey: string }) {
  try {
    const movements = await database().inventoryMovement.findMany({
      where: { storeId: input.storeId, sourceType: input.sourceType, sourceId: input.sourceId },
      orderBy: { createdAt: "asc" },
      include: { product: { select: { id: true, name: true, lowStockThreshold: true, sellingUnit: true, otherUnitRaw: true } } },
    });
    if (!movements.length) return { sent: 0, skipped: true };

    const byProduct = new Map<string, StockEmailItem>();
    for (const movement of movements) {
      const status = classifyStockTransition(movement.previousQuantity, movement.resultingQuantity, movement.product.lowStockThreshold);
      if (!status) continue;
      const candidate: StockEmailItem = {
        name: movement.product.name,
        quantity: movement.resultingQuantity,
        unit: unitLabel(movement.product.sellingUnit, movement.product.otherUnitRaw),
        status,
      };
      const existing = byProduct.get(movement.product.id);
      if (!existing || status === "OUT") byProduct.set(movement.product.id, candidate);
    }

    return await deliverStockItems({ storeId: input.storeId, eventKey: input.eventKey, items: [...byProduct.values()] });
  } catch (error) {
    logger.warn("operational_stock_email_failed", { storeId: input.storeId, eventKey: input.eventKey, error: error instanceof Error ? error.name : "unknown" });
    return { sent: 0, skipped: false, failed: true };
  }
}

export async function sendStockAlertsForUserSource(input: { userId: string; sourceType: string; sourceId: string; eventKey: string }) {
  try {
    const context = await resolveStoreContext(input.userId);
    if (!context) return { sent: 0, skipped: true };
    return await sendStockAlertsForSource({ storeId: context.store.id, sourceType: input.sourceType, sourceId: input.sourceId, eventKey: input.eventKey });
  } catch (error) {
    logger.warn("operational_stock_email_context_failed", { userId: input.userId, eventKey: input.eventKey, error: error instanceof Error ? error.name : "unknown" });
    return { sent: 0, skipped: false, failed: true };
  }
}

export async function sendStockAlertForMovement(userId: string, movementId: string) {
  try {
    const context = await resolveStoreContext(userId);
    if (!context) return { sent: 0, skipped: true };
    const movement = await database().inventoryMovement.findFirst({
      where: { id: movementId, storeId: context.store.id },
      include: { product: { select: { name: true, lowStockThreshold: true, sellingUnit: true, otherUnitRaw: true } } },
    });
    if (!movement) return { sent: 0, skipped: true };
    const status = classifyStockTransition(movement.previousQuantity, movement.resultingQuantity, movement.product.lowStockThreshold);
    if (!status) return { sent: 0, skipped: true };
    return await deliverStockItems({
      storeId: context.store.id,
      eventKey: `movement:${movement.id}`,
      items: [{
        name: movement.product.name,
        quantity: movement.resultingQuantity,
        unit: unitLabel(movement.product.sellingUnit, movement.product.otherUnitRaw),
        status,
      }],
    });
  } catch (error) {
    logger.warn("operational_stock_movement_email_failed", { userId, movementId, error: error instanceof Error ? error.name : "unknown" });
    return { sent: 0, skipped: false, failed: true };
  }
}

export async function sendReceiptStatusAlert(receiptId: string, expectedStatus: "REVIEW_READY" | "FAILED") {
  try {
    const receipt = await database().receipt.findUnique({
      where: { id: receiptId },
      select: { id: true, storeId: true, status: true, supplierText: true, _count: { select: { lines: true } } },
    });
    if (!receipt || receipt.status !== expectedStatus) return { sent: 0, skipped: true };
    const context = await storeNotificationContext(receipt.storeId);
    if (!context || context.preference?.receiptNotifications === false) return { sent: 0, skipped: true };

    const receiptUrl = absoluteAppUrl(expectedStatus === "REVIEW_READY" ? `/receipts/${receipt.id}/review` : `/receipts/${receipt.id}`);
    let sent = 0;
    for (const membership of context.memberships) {
      const owner = membership.user;
      const result = await deliverEmail({
        storeId: context.id,
        userId: owner.id,
        kind: expectedStatus === "REVIEW_READY" ? "RECEIPT_READY" : "RECEIPT_FAILED",
        recipient: owner.email,
        idempotencyKey: `operational-receipt:${receipt.id}:${expectedStatus}:${owner.id}`,
        email: receiptStatusEmail({
          storeName: context.name,
          supplier: receipt.supplierText,
          itemCount: receipt._count.lines,
          status: expectedStatus,
          receiptUrl,
          locale: owner.preferredLanguage as OperationalEmailLocale,
        }),
      });
      if (result.status === "SENT") sent += 1;
    }
    return { sent, skipped: false };
  } catch (error) {
    logger.warn("operational_receipt_email_failed", { receiptId, status: expectedStatus, error: error instanceof Error ? error.name : "unknown" });
    return { sent: 0, skipped: false, failed: true };
  }
}

function manilaDay(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: "year" | "month" | "day") => Number(parts.find(part => part.type === type)?.value);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const start = new Date(Date.UTC(year, month - 1, day) - 8 * 60 * 60 * 1000);
  return { key, start };
}

function summaryDateLabel(now: Date, locale: OperationalEmailLocale) {
  return new Intl.DateTimeFormat(locale === "FIL" ? "fil-PH" : "en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);
}

async function dailySummaryForStore(storeId: string, now: Date): Promise<DailyStoreSummary> {
  const { start } = manilaDay(now);
  const [sales, products, receiptCounts] = await Promise.all([
    database().sale.aggregate({
      where: { storeId, status: "CONFIRMED", confirmedAt: { gte: start, lte: now } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    database().product.findMany({
      where: { storeId, status: "ACTIVE" },
      select: { lowStockThreshold: true, balance: { select: { quantity: true } } },
    }),
    database().receipt.groupBy({
      by: ["status"],
      where: { storeId, status: { in: ["REVIEW_READY", "FAILED"] } },
      _count: { id: true },
    }),
  ]);
  const receiptByStatus = new Map(receiptCounts.map(item => [item.status, item._count.id]));
  const salesAmount = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(sales._sum.totalAmount ?? 0));
  return {
    salesAmount,
    saleCount: sales._count.id,
    outOfStockCount: products.filter(product => (product.balance?.quantity ?? 0) === 0).length,
    lowStockCount: products.filter(product => {
      const quantity = product.balance?.quantity ?? 0;
      return quantity > 0 && quantity <= product.lowStockThreshold;
    }).length,
    receiptsReadyCount: receiptByStatus.get("REVIEW_READY") ?? 0,
    receiptsFailedCount: receiptByStatus.get("FAILED") ?? 0,
  };
}

export async function sendDailyStoreSummaries(now = new Date()) {
  const stores = await database().store.findMany({
    where: { memberships: { some: { role: "OWNER", status: "ACTIVE" } } },
    select: {
      id: true,
      name: true,
      preference: { select: { dailySummaryEnabled: true } },
      memberships: {
        where: { role: "OWNER", status: "ACTIVE" },
        select: { user: { select: { id: true, email: true, preferredLanguage: true } } },
      },
    },
  });
  const day = manilaDay(now);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const store of stores) {
    if (store.preference?.dailySummaryEnabled === false) {
      skipped += 1;
      continue;
    }
    try {
      const summary = await dailySummaryForStore(store.id, now);
      for (const membership of store.memberships) {
        const owner = membership.user;
        const locale = owner.preferredLanguage as OperationalEmailLocale;
        const result = await deliverEmail({
          storeId: store.id,
          userId: owner.id,
          kind: "DAILY_STORE_SUMMARY",
          recipient: owner.email,
          idempotencyKey: `daily-store-summary:${store.id}:${owner.id}:${day.key}`,
          email: dailyStoreSummaryEmail(store.name, summary, absoluteAppUrl("/dashboard"), locale, summaryDateLabel(now, locale)),
        });
        if (result.status === "SENT") sent += 1;
        else failed += 1;
      }
    } catch (error) {
      failed += store.memberships.length || 1;
      logger.warn("daily_store_summary_failed", { storeId: store.id, error: error instanceof Error ? error.name : "unknown" });
    }
  }

  return { stores: stores.length, sent, failed, skipped, day: day.key };
}

export const operationalEmailInternals = { manilaDay };
