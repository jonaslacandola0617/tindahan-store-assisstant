import { database } from "../src/platform/persistence/prisma";
import { normalizeName } from "../src/modules/catalog/domain/product";
import { hashPassword } from "../src/modules/identity/domain/password";
import { createProduct, generateBarcode } from "../src/modules/inventory/application/inventory-service";
import { confirmSale } from "../src/modules/sales/application/sales-service";
import { confirmReceipt } from "../src/modules/receipts/application/receipt-service";
import { employerShowcase } from "../src/platform/showcase";

const db = database();

const products = [
  { key: "coffee", name: "Instant Coffee, 3-in-1 Sachet", category: "Beverages", supplier: "Metro Wholesale Supply", unit: "SACHET" as const, price: 8, cost: 5, quantity: 180, threshold: 24, barcode: true },
  { key: "noodles", name: "Pancit Canton, Chili Mansi", category: "Instant Noodles", supplier: "Metro Wholesale Supply", unit: "PACK" as const, price: 16, cost: 12, quantity: 145, threshold: 20, barcode: true },
  { key: "sardines", name: "Canned Sardines, 155g", category: "Canned Goods", supplier: "Bayan Grocery Depot", unit: "CAN" as const, price: 26, cost: 20, quantity: 90, threshold: 12, barcode: true },
  { key: "milk", name: "Powdered Milk, 33g", category: "Dairy & Eggs", supplier: "Bayan Grocery Depot", unit: "PACK" as const, price: 18, cost: 14, quantity: 78, threshold: 12, barcode: true },
  { key: "shampoo", name: "Shampoo, Sachet", category: "Personal Care", supplier: "Metro Wholesale Supply", unit: "SACHET" as const, price: 7, cost: 4, quantity: 105, threshold: 18, barcode: true },
  { key: "laundry", name: "Laundry Powder, Sachet", category: "Household", supplier: "Bayan Grocery Depot", unit: "SACHET" as const, price: 9, cost: 6, quantity: 110, threshold: 18, barcode: false },
  { key: "water", name: "Bottled Water, 500ml", category: "Beverages", supplier: "Metro Wholesale Supply", unit: "BOTTLE" as const, price: 15, cost: 10, quantity: 86, threshold: 12, barcode: true },
  { key: "snack", name: "Corn Snack, 25g", category: "Snacks", supplier: "Bayan Grocery Depot", unit: "PACK" as const, price: 10, cost: 7, quantity: 72, threshold: 12, barcode: false },
  { key: "eggs", name: "Fresh Eggs (Medium)", category: "Dairy & Eggs", supplier: "Neighborhood Egg Supplier", unit: "PIECE" as const, price: 9, cost: 7, quantity: 8, threshold: 12, barcode: false },
  { key: "soy", name: "Soy Sauce, 200ml", category: "Condiments", supplier: "Bayan Grocery Depot", unit: "BOTTLE" as const, price: 22, cost: 16, quantity: 42, threshold: 8, barcode: false },
  { key: "rice", name: "Premium Rice, 1kg", category: "Rice & Staples", supplier: "Neighborhood Rice Dealer", unit: "PACK" as const, price: 62, cost: 52, quantity: 58, threshold: 10, barcode: false },
  { key: "toothpaste", name: "Toothpaste, 80g", category: "Personal Care", supplier: "Metro Wholesale Supply", unit: "PIECE" as const, price: 45, cost: 36, quantity: 5, threshold: 10, barcode: true },
  { key: "dishwashing", name: "Dishwashing Liquid, 250ml", category: "Household", supplier: "Bayan Grocery Depot", unit: "BOTTLE" as const, price: 35, cost: 27, quantity: 0, threshold: 8, barcode: true },
  { key: "cola", name: "Cola, 1.5L", category: "Beverages", supplier: "Metro Wholesale Supply", unit: "BOTTLE" as const, price: 75, cost: 61, quantity: 50, threshold: 10, barcode: true },
  { key: "corned", name: "Corned Beef, 150g", category: "Canned Goods", supplier: "Bayan Grocery Depot", unit: "CAN" as const, price: 42, cost: 34, quantity: 56, threshold: 10, barcode: true },
  { key: "biscuits", name: "Cream Biscuits, 30g", category: "Snacks", supplier: "Metro Wholesale Supply", unit: "PACK" as const, price: 9, cost: 6, quantity: 84, threshold: 14, barcode: true },
] as const;

const saleFixtures = [
  { ageHours: 0.6, lines: [["coffee", 6], ["noodles", 4], ["biscuits", 3]] },
  { ageHours: 1.8, lines: [["cola", 2], ["snack", 3], ["water", 2]] },
  { ageHours: 3.2, lines: [["coffee", 4], ["sardines", 2], ["rice", 1]] },
  { ageHours: 26, lines: [["noodles", 6], ["shampoo", 5], ["laundry", 4]] },
  { ageHours: 31, lines: [["coffee", 8], ["milk", 3], ["biscuits", 4]] },
  { ageHours: 49, lines: [["cola", 3], ["sardines", 4], ["soy", 2]] },
  { ageHours: 57, lines: [["coffee", 7], ["noodles", 5], ["snack", 4]] },
  { ageHours: 74, lines: [["water", 6], ["shampoo", 4], ["biscuits", 5]] },
  { ageHours: 98, lines: [["coffee", 9], ["noodles", 6], ["milk", 4]] },
  { ageHours: 121, lines: [["sardines", 5], ["rice", 2], ["soy", 2]] },
  { ageHours: 145, lines: [["coffee", 6], ["laundry", 6], ["snack", 5]] },
  { ageHours: 169, lines: [["noodles", 7], ["shampoo", 6], ["water", 4]] },
  { ageHours: 193, lines: [["coffee", 8], ["corned", 3], ["biscuits", 5]] },
  { ageHours: 217, lines: [["cola", 4], ["sardines", 3], ["rice", 2]] },
  { ageHours: 241, lines: [["coffee", 7], ["noodles", 5], ["milk", 4]] },
  { ageHours: 265, lines: [["laundry", 7], ["shampoo", 5], ["snack", 4]] },
  { ageHours: 289, lines: [["coffee", 6], ["water", 5], ["corned", 2]] },
  { ageHours: 313, lines: [["noodles", 6], ["sardines", 4], ["biscuits", 5]] },
] as const;

function timestampHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function ensureUsers() {
  const [ownerPasswordHash, staffPasswordHash] = await Promise.all([
    hashPassword(employerShowcase.password),
    hashPassword("staff1234"),
  ]);
  const owner = await db.user.upsert({
    where: { email: employerShowcase.email },
    update: { name: employerShowcase.ownerName, passwordHash: ownerPasswordHash, emailVerified: new Date() },
    create: { name: employerShowcase.ownerName, email: employerShowcase.email, passwordHash: ownerPasswordHash, emailVerified: new Date() },
  });
  const staff = await db.user.upsert({
    where: { email: employerShowcase.staffEmail },
    update: { name: employerShowcase.staffName, passwordHash: staffPasswordHash, emailVerified: new Date() },
    create: { name: employerShowcase.staffName, email: employerShowcase.staffEmail, passwordHash: staffPasswordHash, emailVerified: new Date() },
  });
  return { owner, staff };
}

async function ensureStore(ownerId: string, staffId: string) {
  const existingMembership = await db.storeMembership.findFirst({
    where: { userId: ownerId, role: "OWNER" },
    orderBy: { createdAt: "asc" },
  });

  const store = existingMembership
    ? await db.store.update({
        where: { id: existingMembership.storeId },
        data: {
          name: employerShowcase.storeName,
          storeType: "Sari-sari store",
          address: "Angeles City, Pampanga",
          contact: "0917 555 0148",
        },
      })
    : await db.store.create({
        data: {
          name: employerShowcase.storeName,
          storeType: "Sari-sari store",
          address: "Angeles City, Pampanga",
          contact: "0917 555 0148",
          preference: { create: { defaultLanguage: "EN", lowStockEnabled: true, dailySummaryEnabled: true, receiptNotifications: true } },
          memberships: { create: { userId: ownerId, role: "OWNER", status: "ACTIVE" } },
          subscription: { create: { plan: "PILOT", status: "ACTIVE", provider: "manual" } },
        },
      });

  await db.storeMembership.upsert({
    where: { storeId_userId: { storeId: store.id, userId: ownerId } },
    update: { role: "OWNER", status: "ACTIVE" },
    create: { storeId: store.id, userId: ownerId, role: "OWNER", status: "ACTIVE" },
  });
  await db.storeMembership.upsert({
    where: { storeId_userId: { storeId: store.id, userId: staffId } },
    update: { role: "STAFF", status: "ACTIVE" },
    create: { storeId: store.id, userId: staffId, role: "STAFF", status: "ACTIVE" },
  });
  await db.storePreference.upsert({
    where: { storeId: store.id },
    update: { defaultLanguage: "EN", lowStockEnabled: true, dailySummaryEnabled: true, receiptNotifications: true },
    create: { storeId: store.id, defaultLanguage: "EN", lowStockEnabled: true, dailySummaryEnabled: true, receiptNotifications: true },
  });
  await db.storeSubscription.upsert({
    where: { storeId: store.id },
    update: { plan: "PILOT", status: "ACTIVE", provider: "manual" },
    create: { storeId: store.id, plan: "PILOT", status: "ACTIVE", provider: "manual" },
  });
  return store;
}

async function ensureProducts(ownerId: string, storeId: string) {
  const ids = new Map<string, string>();
  for (const fixture of products) {
    let product = await db.product.findFirst({
      where: { storeId, normalizedName: normalizeName(fixture.name) },
      select: { id: true, status: true, barcodes: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 } },
    });
    if (product?.status === "ARCHIVED") throw new Error(`${fixture.name} exists as an archived product in the showcase store.`);
    if (!product) {
      const created = await createProduct(ownerId, {
        name: fixture.name,
        description: "Employer showcase sample product",
        category: fixture.category,
        supplier: fixture.supplier,
        sellingUnit: fixture.unit,
        sellingPrice: fixture.price,
        latestPurchaseCost: fixture.cost,
        lowStockThreshold: fixture.threshold,
        startingQuantity: fixture.quantity,
        barcodeChoice: fixture.barcode ? "INTERNAL" : "NONE",
        idempotencyKey: `employer-demo-product-${fixture.key}`,
      });
      product = { id: created.id, status: "ACTIVE", barcodes: created.barcode ? [{ id: created.barcode }] : [] };
    }
    if (fixture.barcode && product.barcodes.length === 0) {
      await generateBarcode(ownerId, product.id, { idempotencyKey: `employer-demo-barcode-${fixture.key}` });
    }
    ids.set(fixture.key, product.id);
  }
  return ids;
}

async function ensureSales(ownerId: string, storeId: string, productIds: Map<string, string>) {
  for (const [index, fixture] of saleFixtures.entries()) {
    const idempotencyKey = `employer-demo-sale-${String(index + 1).padStart(2, "0")}`;
    const result = await confirmSale(ownerId, {
      lines: fixture.lines.map(([key, quantity]) => ({ productId: productIds.get(key)!, quantity })),
      idempotencyKey,
    });
    const occurredAt = timestampHoursAgo(fixture.ageHours);
    await db.$transaction([
      db.sale.update({ where: { id: result.saleId }, data: { createdAt: occurredAt, confirmedAt: occurredAt } }),
      db.inventoryMovement.updateMany({ where: { storeId, sourceType: "SALE", sourceId: result.saleId }, data: { createdAt: occurredAt } }),
      db.auditEvent.updateMany({ where: { storeId, entityType: "Sale", entityId: result.saleId, action: "SALE_CONFIRMED" }, data: { createdAt: occurredAt } }),
    ]);
  }
}

async function ensureConfirmedReceipt(ownerId: string, storeId: string, productIds: Map<string, string>) {
  const idempotencyKey = "employer-demo-receipt-confirmed";
  let receipt = await db.receipt.findFirst({ where: { storeId, idempotencyKey } });
  if (!receipt) {
    receipt = await db.receipt.create({
      data: {
        storeId,
        createdById: ownerId,
        status: "REVIEW_READY",
        idempotencyKey,
        correlationId: "employer-demo-receipt-confirmed-correlation",
        supplierText: "Metro Wholesale Supply",
        grandTotal: 1500,
        lines: { create: [
          { storeId, sourceOrder: 1, rawText: "INSTANT COFFEE 3IN1 24 5.00", rawName: "INSTANT COFFEE 3IN1", normalizedName: "instant coffee 3in1", quantity: 24, unitPrice: 5, lineTotal: 120, excluded: false, reviewState: "CONFIRMED", finalProductId: productIds.get("coffee")!, finalQuantity: 24, confirmedUnitPrice: 5, confirmedLineTotal: 120 },
          { storeId, sourceOrder: 2, rawText: "PANCIT CANTON CHILI MANSI 24 12.00", rawName: "PANCIT CANTON CHILI MANSI", normalizedName: "pancit canton chili mansi", quantity: 24, unitPrice: 12, lineTotal: 288, excluded: false, reviewState: "CONFIRMED", finalProductId: productIds.get("noodles")!, finalQuantity: 24, confirmedUnitPrice: 12, confirmedLineTotal: 288 },
          { storeId, sourceOrder: 3, rawText: "COLA 1.5L 12 61.00", rawName: "COLA 1.5L", normalizedName: "cola 1.5l", quantity: 12, unitPrice: 61, lineTotal: 732, excluded: false, reviewState: "CONFIRMED", finalProductId: productIds.get("cola")!, finalQuantity: 12, confirmedUnitPrice: 61, confirmedLineTotal: 732 },
          { storeId, sourceOrder: 4, rawText: "DELIVERY FEE 360.00", rawName: "Delivery fee", normalizedName: "delivery fee", quantity: 1, unitPrice: 360, lineTotal: 360, excluded: true, reviewState: "EXCLUDED" },
        ] },
      },
    });
  }
  if (receipt.status === "REVIEW_READY") {
    await confirmReceipt(ownerId, receipt.id, { idempotencyKey: "employer-demo-confirm-receipt-action", acknowledgeDuplicate: false });
  }
  const occurredAt = timestampHoursAgo(92);
  const confirmed = await db.receipt.findUniqueOrThrow({ where: { id: receipt.id }, include: { confirmation: true } });
  await db.$transaction([
    db.receipt.update({ where: { id: receipt.id }, data: { createdAt: occurredAt, confirmedAt: occurredAt } }),
    ...(confirmed.confirmation ? [db.receiptConfirmation.update({ where: { id: confirmed.confirmation.id }, data: { confirmedAt: occurredAt } })] : []),
    db.inventoryMovement.updateMany({ where: { storeId, receiptConfirmationId: confirmed.confirmation?.id }, data: { createdAt: occurredAt } }),
  ]);
}

async function ensureReviewReceipt(ownerId: string, storeId: string, productIds: Map<string, string>) {
  const idempotencyKey = "employer-demo-receipt-review";
  const existing = await db.receipt.findFirst({ where: { storeId, idempotencyKey } });
  if (existing) return;
  await db.receipt.create({
    data: {
      storeId,
      createdById: ownerId,
      status: "REVIEW_READY",
      idempotencyKey,
      correlationId: "employer-demo-receipt-review-correlation",
      supplierText: "Bayan Grocery Depot",
      grandTotal: 1044,
      createdAt: timestampHoursAgo(1.2),
      lines: { create: [
        { storeId, sourceOrder: 1, rawText: "ARGENTINA CORNED BEEF 150G 12 34.00", rawName: "Corned Beef, 150g", normalizedName: "corned beef 150g", quantity: 12, unitPrice: 34, lineTotal: 408, excluded: false, reviewState: "CONFIRMED", finalProductId: productIds.get("corned")!, finalQuantity: 12, confirmedUnitPrice: 34, confirmedLineTotal: 408 },
        { storeId, sourceOrder: 2, rawText: "SARDINES 155G 24 20.00", rawName: "Canned Sardines, 155g", normalizedName: "canned sardines 155g", quantity: 24, unitPrice: 20, lineTotal: 480, excluded: false, reviewState: "CONFIRMED", finalProductId: productIds.get("sardines")!, finalQuantity: 24, confirmedUnitPrice: 20, confirmedLineTotal: 480 },
        { storeId, sourceOrder: 3, rawText: "CREAM BISCUITS 12 6.00", rawName: "Cream Biscuits, 30g", normalizedName: "cream biscuits 30g", quantity: 12, unitPrice: 6, lineTotal: 72, excluded: false, reviewState: "CONFIRMED", finalProductId: productIds.get("biscuits")!, finalQuantity: 12, confirmedUnitPrice: 6, confirmedLineTotal: 72 },
        { storeId, sourceOrder: 4, rawText: "DELIVERY FEE 84.00", rawName: "Delivery fee", normalizedName: "delivery fee", quantity: 1, unitPrice: 84, lineTotal: 84, excluded: true, reviewState: "EXCLUDED" },
      ] },
    },
  });
}

async function ensureFailedReceipt(ownerId: string, storeId: string) {
  const idempotencyKey = "employer-demo-receipt-failed";
  const existing = await db.receipt.findFirst({ where: { storeId, idempotencyKey } });
  if (existing) return;
  const occurredAt = timestampHoursAgo(38);
  await db.receipt.create({
    data: {
      storeId,
      createdById: ownerId,
      status: "FAILED",
      idempotencyKey,
      correlationId: "employer-demo-receipt-failed-correlation",
      supplierText: "Sample Supplier Receipt",
      createdAt: occurredAt,
      failedAt: occurredAt,
      lastErrorCode: "UNREADABLE_RECEIPT",
    },
  });
}

async function main() {
  const { owner, staff } = await ensureUsers();
  const store = await ensureStore(owner.id, staff.id);
  const productIds = await ensureProducts(owner.id, store.id);
  await ensureSales(owner.id, store.id, productIds);
  await ensureConfirmedReceipt(owner.id, store.id, productIds);
  await ensureReviewReceipt(owner.id, store.id, productIds);
  await ensureFailedReceipt(owner.id, store.id);

  const [productCount, saleCount, receiptCount, staffCount] = await Promise.all([
    db.product.count({ where: { storeId: store.id, status: "ACTIVE" } }),
    db.sale.count({ where: { storeId: store.id, status: { in: ["CONFIRMED", "CORRECTED"] } } }),
    db.receipt.count({ where: { storeId: store.id } }),
    db.storeMembership.count({ where: { storeId: store.id, role: "STAFF", status: "ACTIVE" } }),
  ]);

  console.info("Employer showcase is ready.");
  console.info(`Store: ${store.name}`);
  console.info(`Login: ${employerShowcase.email} / ${employerShowcase.password}`);
  console.info(`Seeded: ${productCount} products, ${saleCount} sales, ${receiptCount} receipts, ${staffCount} active staff.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Employer showcase seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
