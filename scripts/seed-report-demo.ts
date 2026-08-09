import { database } from "../src/platform/persistence/prisma";
import { normalizeName } from "../src/modules/catalog/domain/product";
import { createProduct, generateBarcode } from "../src/modules/inventory/application/inventory-service";
import { confirmSale } from "../src/modules/sales/application/sales-service";

const db = database();

const fixtures = [
  { key: "coffee", name: "Instant Coffee, 3-in-1 Sachet", category: "Beverages", supplier: "Metro Wholesale Supply", unit: "SACHET" as const, price: 8, cost: 5, quantity: 120, threshold: 20, barcode: true },
  { key: "noodles", name: "Pancit Canton, Chili Mansi", category: "Instant Noodles", supplier: "Metro Wholesale Supply", unit: "PACK" as const, price: 16, cost: 12, quantity: 90, threshold: 15, barcode: true },
  { key: "sardines", name: "Canned Sardines, 155g", category: "Canned Goods", supplier: "Bayan Grocery Depot", unit: "CAN" as const, price: 26, cost: 20, quantity: 50, threshold: 10, barcode: true },
  { key: "milk", name: "Powdered Milk, 33g", category: "Dairy & Eggs", supplier: "Bayan Grocery Depot", unit: "PACK" as const, price: 18, cost: 14, quantity: 40, threshold: 10, barcode: true },
  { key: "shampoo", name: "Shampoo, Sachet", category: "Personal Care", supplier: "Metro Wholesale Supply", unit: "SACHET" as const, price: 7, cost: 4, quantity: 70, threshold: 15, barcode: true },
  { key: "laundry", name: "Laundry Powder, Sachet", category: "Household", supplier: "Bayan Grocery Depot", unit: "SACHET" as const, price: 9, cost: 6, quantity: 65, threshold: 15, barcode: false },
  { key: "water", name: "Bottled Water, 500ml", category: "Beverages", supplier: "Metro Wholesale Supply", unit: "BOTTLE" as const, price: 15, cost: 10, quantity: 40, threshold: 8, barcode: true },
  { key: "snack", name: "Corn Snack, 25g", category: "Snacks", supplier: "Bayan Grocery Depot", unit: "PACK" as const, price: 10, cost: 7, quantity: 30, threshold: 8, barcode: false },
  { key: "eggs", name: "Fresh Eggs (Medium)", category: "Dairy & Eggs", supplier: "Neighborhood Egg Supplier", unit: "PIECE" as const, price: 9, cost: 7, quantity: 24, threshold: 12, barcode: false },
  { key: "soy", name: "Soy Sauce, 200ml", category: "Condiments", supplier: "Bayan Grocery Depot", unit: "BOTTLE" as const, price: 22, cost: 16, quantity: 25, threshold: 6, barcode: false },
  { key: "rice", name: "Premium Rice, 1kg", category: "Rice & Staples", supplier: "Neighborhood Rice Dealer", unit: "PACK" as const, price: 62, cost: 52, quantity: 35, threshold: 8, barcode: false },
  { key: "toothpaste", name: "Toothpaste, 80g", category: "Personal Care", supplier: "Metro Wholesale Supply", unit: "PIECE" as const, price: 45, cost: 36, quantity: 6, threshold: 10, barcode: true },
  { key: "dishwashing", name: "Dishwashing Liquid, 250ml", category: "Household", supplier: "Bayan Grocery Depot", unit: "BOTTLE" as const, price: 35, cost: 27, quantity: 0, threshold: 8, barcode: true },
] as const;

const saleFixtures = [
  [["coffee", 18], ["noodles", 12], ["snack", 8]],
  [["coffee", 14], ["shampoo", 10], ["water", 6]],
  [["noodles", 10], ["sardines", 8], ["milk", 6]],
  [["coffee", 12], ["laundry", 12], ["eggs", 8]],
  [["noodles", 8], ["shampoo", 12], ["water", 7], ["soy", 4]],
  [["coffee", 10], ["sardines", 6], ["snack", 5], ["eggs", 8]],
] as const;

function argument(name: string) {
  const inline = process.argv.find(value => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email = (argument("email") ?? process.env.REPORT_SEED_EMAIL ?? "").trim().toLowerCase();
  const dryRun = process.argv.includes("--dry-run");
  if (!email) throw new Error("Provide --email <address> or REPORT_SEED_EMAIL.");

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { role: true, store: { select: { id: true, name: true } } },
      },
    },
  });
  if (!user) throw new Error("No account was found for that email.");
  const membership = user.memberships.find(item => item.role === "OWNER") ?? user.memberships[0];
  if (!membership) throw new Error("That account has no active store membership.");
  if (membership.role !== "OWNER") throw new Error("Report demo products can only be seeded for a store Owner.");

  console.info(`Seed target: ${user.name || user.email} · ${membership.store.name} · ${membership.role}`);
  console.info(`Planned fixtures: ${fixtures.length} products, ${fixtures.filter(item => item.barcode).length} barcoded products, ${saleFixtures.length} sales.`);
  if (dryRun) return;

  const productIds = new Map<string, string>();
  for (const fixture of fixtures) {
    let product = await db.product.findFirst({
      where: { storeId: membership.store.id, normalizedName: normalizeName(fixture.name) },
      select: { id: true, status: true, barcodes: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 } },
    });
    if (product?.status === "ARCHIVED") throw new Error(`${fixture.name} already exists as an archived product. Restore or rename it before seeding.`);
    if (!product) {
      const created = await createProduct(user.id, {
        name: fixture.name,
        description: "Report demo inventory fixture",
        category: fixture.category,
        supplier: fixture.supplier,
        sellingUnit: fixture.unit,
        sellingPrice: fixture.price,
        latestPurchaseCost: fixture.cost,
        lowStockThreshold: fixture.threshold,
        startingQuantity: fixture.quantity,
        barcodeChoice: fixture.barcode ? "INTERNAL" : "NONE",
        idempotencyKey: `report-demo-product-${fixture.key}`,
      });
      product = { id: created.id, status: "ACTIVE", barcodes: created.barcode ? [{ id: created.barcode }] : [] };
    }
    if (fixture.barcode && product.barcodes.length === 0) {
      await generateBarcode(user.id, product.id, { idempotencyKey: `report-demo-barcode-${fixture.key}` });
    }
    productIds.set(fixture.key, product.id);
  }

  for (const [index, sale] of saleFixtures.entries()) {
    await confirmSale(user.id, {
      lines: sale.map(([key, quantity]) => ({ productId: productIds.get(key)!, quantity })),
      idempotencyKey: `report-demo-sale-${index + 1}`,
    });
  }

  const [productCount, saleCount] = await Promise.all([
    db.product.count({ where: { storeId: membership.store.id, description: "Report demo inventory fixture" } }),
    db.sale.count({ where: { storeId: membership.store.id, idempotencyKey: { startsWith: "report-demo-sale-" } } }),
  ]);
  console.info(`Report demo ready: ${productCount} seeded products and ${saleCount} seeded sales are present.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Report demo seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
