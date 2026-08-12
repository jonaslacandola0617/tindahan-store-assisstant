import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { database } from "@/platform/persistence/prisma";
import { getOperatingReport, globalSearch, listNotifications, markNotificationRead } from "./operating-view-service";

const databaseTests = process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE ? describe : describe.skip;

databaseTests("operating view PostgreSQL integration", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let userId = "", outsiderId = "", storeId = "", otherStoreId = "", productId = "";
  beforeAll(async () => {
    const db = database();
    const owner = await db.user.create({ data: { email: `operating-owner-${suffix}@example.test` } });
    const outsider = await db.user.create({ data: { email: `operating-outsider-${suffix}@example.test` } });
    userId = owner.id; outsiderId = outsider.id;
    const store = await db.store.create({ data: { name: `Operating View Test ${suffix}`, preference: { create: {} }, memberships: { create: { userId, role: "OWNER" } } } });
    const other = await db.store.create({ data: { name: `Other Operating View Test ${suffix}`, preference: { create: {} }, memberships: { create: { userId: outsiderId, role: "OWNER" } } } });
    storeId = store.id; otherStoreId = other.id;
    const category = await db.category.create({ data: { storeId, name: "Beverages", normalizedName: "beverages" } });
    const product = await db.product.create({ data: { storeId, categoryId: category.id, name: "Cocoa Drink 33g", normalizedName: "cocoa drink 33g", sellingUnit: "PACK", sellingPrice: 18, lowStockThreshold: 3, balance: { create: { storeId, quantity: 2 } } } });
    productId = product.id;
    const sale = await db.sale.create({ data: { storeId, createdById: userId, status: "CONFIRMED", totalAmount: 36, totalQuantity: 2, confirmedAt: new Date(), lines: { create: { storeId, productId, productNameSnapshot: product.name, unitSnapshot: "PACK", quantity: 2, unitPrice: 18, lineTotal: 36 } } } });
    await db.inventoryMovement.create({ data: { storeId, productId, actorId: userId, type: "SALE", quantityDelta: -2, previousQuantity: 4, resultingQuantity: 2, sourceType: "SALE", sourceId: sale.id, correlationId: `operating-view-${suffix}` } });
    await db.receipt.create({ data: { storeId, createdById: userId, status: "REVIEW_READY", supplierText: "Sample Supplier", correlationId: `receipt-${suffix}`, lines: { create: { storeId, sourceOrder: 1, rawText: "COCOA DRINK", rawName: "Cocoa Drink", normalizedName: "cocoa drink", quantity: 1, excluded: false, reviewState: "UNMATCHED" } } } });
  });
  afterAll(async () => {
    const db = database();
    for (const id of [storeId, otherStoreId]) {
      if (!id) continue;
      await db.notification.deleteMany({ where: { storeId: id } });
      await db.inventoryMovement.deleteMany({ where: { storeId: id } });
      await db.saleLine.deleteMany({ where: { storeId: id } });
      await db.sale.deleteMany({ where: { storeId: id } });
      await db.receiptLine.deleteMany({ where: { storeId: id } });
      await db.receipt.deleteMany({ where: { storeId: id } });
      await db.inventoryBalance.deleteMany({ where: { storeId: id } });
      await db.product.deleteMany({ where: { storeId: id } });
      await db.category.deleteMany({ where: { storeId: id } });
      await db.storeMembership.deleteMany({ where: { storeId: id } });
      await db.storePreference.deleteMany({ where: { storeId: id } });
      await db.store.deleteMany({ where: { id } });
    }
    await db.user.deleteMany({ where: { id: { in: [userId, outsiderId] } } });
  });
  it("reconciles confirmed sales and movement totals", async () => {
    const report = await getOperatingReport(userId, "month");
    expect(report.topProducts[0]).toMatchObject({ productId, quantity: 2, amount: "36.00" });
    expect(report.movementSummary).toMatchObject({ sold: 2, net: -2 });
    expect(report.lowStock[0]).toMatchObject({ id: productId, quantity: 2, status: "low" });
  });
  it("searches store-owned entities and excludes another store", async () => {
    expect((await globalSearch(userId, "Cocoa")).products[0]?.id).toBe(productId);
    expect((await globalSearch(outsiderId, "Cocoa")).count).toBe(0);
  });
  it("groups operational notifications and marks them read", async () => {
    const first = await listNotifications(userId);
    const second = await listNotifications(userId);
    expect(second.items).toHaveLength(first.items.length);
    expect(first.unreadCount).toBeGreaterThanOrEqual(2);
    await markNotificationRead(userId);
    expect((await listNotifications(userId)).unreadCount).toBe(0);
  });
});
