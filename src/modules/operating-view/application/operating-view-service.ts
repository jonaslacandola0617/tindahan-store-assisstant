import { createHash } from "node:crypto";
import { z } from "zod";
import { database } from "@/platform/persistence/prisma";
import { resolveStoreContext } from "@/modules/stores/application/store-context";

const rangeSchema = z.enum(["week", "month"]);
const searchSchema = z.string().trim().max(120);

export class OperatingViewError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "NOT_FOUND" | "INVALID_INPUT",
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function storeFor(userId: string) {
  const context = await resolveStoreContext(userId);
  if (!context) throw new OperatingViewError("FORBIDDEN", "You do not have access to a store.", 403);
  return context.store;
}

function manilaPeriod(range: "week" | "month", now = new Date()) {
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();
  const startDay = range === "month" ? 1 : day - ((local.getUTCDay() + 6) % 7);
  const start = new Date(Date.UTC(year, month, startDay) - 8 * 60 * 60 * 1000);
  return { start, end: now };
}

export async function getOperatingReport(userId: string, rawRange: unknown = "month") {
  const store = await storeFor(userId);
  const range = rangeSchema.parse(rawRange);
  const period = manilaPeriod(range);
  const [products, saleLines, recentSaleLines, movements] = await Promise.all([
    database().product.findMany({
      where: { storeId: store.id, status: "ACTIVE" },
      orderBy: [{ balance: { quantity: "asc" } }, { normalizedName: "asc" }],
      include: { balance: true },
    }),
    database().saleLine.findMany({
      where: { storeId: store.id, sale: { status: "CONFIRMED", confirmedAt: { gte: period.start, lte: period.end } } },
      select: { productId: true, productNameSnapshot: true, quantity: true, lineTotal: true, sale: { select: { confirmedAt: true } } },
    }),
    database().saleLine.findMany({
      where: { storeId: store.id, sale: { status: "CONFIRMED" }, product: { status: "ACTIVE" } },
      distinct: ["productId"],
      orderBy: { sale: { confirmedAt: "desc" } },
      select: { productId: true, sale: { select: { confirmedAt: true } } },
    }),
    database().inventoryMovement.findMany({
      where: { storeId: store.id, createdAt: { gte: period.start, lte: period.end } },
      select: { type: true, quantityDelta: true, sourceType: true },
    }),
  ]);

  const totals = new Map<string, { productId: string; name: string; quantity: number; amount: number; lastSoldAt: Date | null }>();
  for (const line of saleLines) {
    const current = totals.get(line.productId) ?? { productId: line.productId, name: line.productNameSnapshot, quantity: 0, amount: 0, lastSoldAt: null };
    current.quantity += line.quantity;
    current.amount += Number(line.lineTotal);
    if (line.sale.confirmedAt && (!current.lastSoldAt || line.sale.confirmedAt > current.lastSoldAt)) current.lastSoldAt = line.sale.confirmedAt;
    totals.set(line.productId, current);
  }
  const topProducts = [...totals.values()].sort((left, right) => right.quantity - left.quantity || left.name.localeCompare(right.name)).slice(0, 5).map(item => ({ ...item, amount: item.amount.toFixed(2), lastSoldAt: item.lastSoldAt?.toISOString() ?? null }));
  const maxSold = topProducts[0]?.quantity ?? 0;
  const lowStock = products.filter(product => (product.balance?.quantity ?? 0) <= product.lowStockThreshold).slice(0, 5).map(product => ({
    id: product.id,
    name: product.name,
    quantity: product.balance?.quantity ?? 0,
    threshold: product.lowStockThreshold,
    unit: product.otherUnitRaw || product.sellingUnit.toLowerCase(),
    status: (product.balance?.quantity ?? 0) === 0 ? "out" as const : "low" as const,
  }));
  const movementSummary = { received: 0, manualAdded: 0, sold: 0, adjustments: 0, opening: 0, reversals: 0, net: 0 };
  for (const movement of movements) {
    movementSummary.net += movement.quantityDelta;
    if (movement.type === "RECEIPT") movementSummary.received += movement.quantityDelta;
    if (movement.type === "SALE") movementSummary.sold += Math.abs(movement.quantityDelta);
    if (movement.type === "ADJUSTMENT" && movement.sourceType === "ADD_INVENTORY") movementSummary.manualAdded += movement.quantityDelta;
    if (movement.type === "ADJUSTMENT" && movement.sourceType !== "ADD_INVENTORY") movementSummary.adjustments += movement.quantityDelta;
    if (movement.type === "OPENING") movementSummary.opening += movement.quantityDelta;
    if (movement.type === "REVERSAL") movementSummary.reversals += movement.quantityDelta;
  }
  const lastSoldByProduct = new Map(recentSaleLines.map(line => [line.productId, line.sale.confirmedAt]));
  const inactiveCutoff = new Date(period.end.getTime() - (range === "week" ? 7 : 30) * 86_400_000);
  const inactive = products.map(product => ({ product, lastSoldAt: lastSoldByProduct.get(product.id) ?? null })).filter(item => !item.lastSoldAt || item.lastSoldAt < inactiveCutoff).slice(0, 5).map(({ product, lastSoldAt }) => ({
    id: product.id,
    name: product.name,
    quantity: product.balance?.quantity ?? 0,
    unit: product.otherUnitRaw || product.sellingUnit.toLowerCase(),
    lastSoldAt: lastSoldAt?.toISOString() ?? null,
  }));

  return {
    range,
    period: { start: period.start.toISOString(), end: period.end.toISOString() },
    topProducts: topProducts.map(item => ({ ...item, share: maxSold ? Math.round((item.quantity / maxSold) * 100) : 0 })),
    lowStock,
    movementSummary,
    inactive,
    availability: {
      sales: saleLines.length ? "available" as const : "empty" as const,
      movements: movements.length ? "available" as const : "empty" as const,
      inventory: products.length ? "available" as const : "empty" as const,
    },
  };
}

export async function globalSearch(userId: string, rawQuery: unknown) {
  const store = await storeFor(userId);
  const query = searchSchema.parse(rawQuery);
  if (!query) return { query, products: [], categories: [], suppliers: [], receipts: [], count: 0 };
  const barcodeQuery = query.replace(/[\s-]/g, "");
  const [products, categories, suppliers, receipts] = await Promise.all([
    database().product.findMany({
      where: { storeId: store.id, status: "ACTIVE", OR: [
        { name: { contains: query, mode: "insensitive" } },
        { category: { name: { contains: query, mode: "insensitive" } } },
        { supplierReferences: { some: { supplier: { name: { contains: query, mode: "insensitive" } } } } },
        { barcodes: { some: { normalizedValue: { contains: barcodeQuery, mode: "insensitive" }, status: "ACTIVE" } } },
      ] },
      take: 12,
      orderBy: [{ updatedAt: "desc" }, { normalizedName: "asc" }],
      include: { category: true, balance: true, barcodes: { where: { status: "ACTIVE" }, take: 1 } },
    }),
    database().category.findMany({ where: { storeId: store.id, name: { contains: query, mode: "insensitive" }, products: { some: { status: "ACTIVE" } } }, take: 6, orderBy: { normalizedName: "asc" }, include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } } }),
    database().supplier.findMany({ where: { storeId: store.id, name: { contains: query, mode: "insensitive" } }, take: 6, orderBy: { normalizedName: "asc" }, include: { _count: { select: { productReferences: true } } } }),
    database().receipt.findMany({ where: { storeId: store.id, OR: [{ supplierText: { contains: query, mode: "insensitive" } }, { supplier: { name: { contains: query, mode: "insensitive" } } }, { file: { originalFilename: { contains: query, mode: "insensitive" } } }] }, take: 8, orderBy: { createdAt: "desc" }, include: { supplier: true, file: { select: { originalFilename: true } } } }),
  ]);
  const result = {
    query,
    products: products.map(product => ({ id: product.id, name: product.name, category: product.category?.name ?? null, quantity: product.balance?.quantity ?? 0, unit: product.otherUnitRaw || product.sellingUnit.toLowerCase(), barcode: product.barcodes[0]?.value ?? null })),
    categories: categories.map(category => ({ id: category.id, name: category.name, productCount: category._count.products })),
    suppliers: suppliers.map(supplier => ({ id: supplier.id, name: supplier.name, productCount: supplier._count.productReferences })),
    receipts: receipts.map(receipt => ({ id: receipt.id, supplier: receipt.supplier?.name || receipt.supplierText || receipt.file?.originalFilename || "Receipt", status: receipt.status, createdAt: receipt.createdAt.toISOString() })),
  };
  return { ...result, count: result.products.length + result.categories.length + result.suppliers.length + result.receipts.length };
}

type NotificationData = { href?: string; count?: number; names?: string[]; receiptId?: string; itemCount?: number; supplier?: string; active?: boolean };

function notificationId(storeId: string, groupKey: string) {
  return `notif_${createHash("sha256").update(`${storeId}:${groupKey}`).digest("hex").slice(0, 24)}`;
}

function dayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export async function syncOperationalNotifications(userId: string) {
  const store = await storeFor(userId);
  const [preference, products, receipts] = await Promise.all([
    database().storePreference.findUnique({ where: { storeId: store.id } }),
    database().product.findMany({ where: { storeId: store.id, status: "ACTIVE" }, include: { balance: true } }),
    database().receipt.findMany({ where: { storeId: store.id, status: { in: ["REVIEW_READY", "FAILED"] } }, orderBy: { updatedAt: "desc" }, take: 25, include: { supplier: true, _count: { select: { lines: true } } } }),
  ]);
  const writes: Promise<unknown>[] = [];
  if (preference?.lowStockEnabled !== false) {
    const low = products.filter(product => (product.balance?.quantity ?? 0) <= product.lowStockThreshold);
    if (low.length) {
      const groupKey = `low-stock:${dayKey()}`;
      const data: NotificationData = { href: "/inventory?filter=low", count: low.length, names: low.slice(0, 3).map(product => product.name), active: true };
      writes.push(database().notification.upsert({ where: { id: notificationId(store.id, groupKey) }, update: { data, titleKey: "low-stock", bodyKey: "review-inventory" }, create: { id: notificationId(store.id, groupKey), storeId: store.id, type: "LOW_STOCK", titleKey: "low-stock", bodyKey: "review-inventory", groupKey, data } }));
    }
  }
  if (preference?.receiptNotifications !== false) {
    for (const receipt of receipts) {
      const state = receipt.status === "REVIEW_READY" ? "ready" : "failed";
      const groupKey = `receipt:${receipt.id}:${state}`;
      const data: NotificationData = { href: receipt.status === "REVIEW_READY" ? `/receipts/${receipt.id}/review` : `/receipts/${receipt.id}`, receiptId: receipt.id, itemCount: receipt._count.lines, supplier: receipt.supplier?.name ?? undefined, active: true };
      writes.push(database().notification.upsert({ where: { id: notificationId(store.id, groupKey) }, update: { data }, create: { id: notificationId(store.id, groupKey), storeId: store.id, type: receipt.status === "REVIEW_READY" ? "RECEIPT_READY" : "RECEIPT_FAILED", titleKey: receipt.status === "REVIEW_READY" ? "receipt-ready" : "receipt-failed", bodyKey: receipt.status === "REVIEW_READY" ? "review-receipt" : "retry-receipt", groupKey, data } }));
    }
  }
  await Promise.all(writes);
}

export async function listNotifications(userId: string, limit = 50) {
  const store = await storeFor(userId);
  await syncOperationalNotifications(userId);
  const records = await database().notification.findMany({ where: { storeId: store.id, OR: [{ userId: null }, { userId }] }, orderBy: { createdAt: "desc" }, take: Math.min(Math.max(limit, 1), 100) });
  const items = records.map(record => ({ id: record.id, type: record.type, titleKey: record.titleKey, bodyKey: record.bodyKey, data: (record.data ?? {}) as NotificationData, readAt: record.readAt?.toISOString() ?? null, createdAt: record.createdAt.toISOString() })).sort((left, right) => Number(Boolean(left.readAt)) - Number(Boolean(right.readAt)) || right.createdAt.localeCompare(left.createdAt));
  return { items, unreadCount: items.filter(item => !item.readAt).length };
}

export async function notificationUnreadCount(userId: string) {
  const store = await storeFor(userId);
  await syncOperationalNotifications(userId);
  return database().notification.count({ where: { storeId: store.id, OR: [{ userId: null }, { userId }], readAt: null } });
}

export async function markNotificationRead(userId: string, notificationIdValue?: string) {
  const store = await storeFor(userId);
  if (notificationIdValue) {
    const changed = await database().notification.updateMany({ where: { id: notificationIdValue, storeId: store.id, OR: [{ userId: null }, { userId }] }, data: { readAt: new Date() } });
    if (!changed.count) throw new OperatingViewError("NOT_FOUND", "Notification not found.", 404);
    return { count: changed.count };
  }
  return database().notification.updateMany({ where: { storeId: store.id, OR: [{ userId: null }, { userId }], readAt: null }, data: { readAt: new Date() } });
}

export const operatingViewInternals = { manilaPeriod };
