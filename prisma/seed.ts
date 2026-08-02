import { database } from "../src/platform/persistence/prisma";
import { hashPassword } from "../src/modules/identity/domain/password";

const prisma = database();

async function main() {
  const email = "owner@example.test";
  const passwordHash = await hashPassword("change-this-demo-password");
  const owner = await prisma.user.upsert({
    where: { email },
    update: { name: "Rosa Santos", passwordHash },
    create: { name: "Rosa Santos", email, passwordHash },
  });

  let membership = await prisma.storeMembership.findFirst({ where: { userId: owner.id, role: "OWNER" } });
  if (!membership) {
    const store = await prisma.store.create({
      data: {
        name: "Aling Rosa's Store",
        preference: { create: {} },
        memberships: { create: { userId: owner.id, role: "OWNER" } },
      },
    });
    membership = await prisma.storeMembership.findFirst({ where: { userId: owner.id, storeId: store.id } });
  }

  if (!membership) throw new Error("Seed store membership was not created.");
  const fixtures = [
    { name: "Pancit Canton", unit: "PACK" as const, price: 15, quantity: 24, threshold: 6, barcode: "4800016640017", type: "MANUFACTURER" as const },
    { name: "Fresh Eggs (Medium)", unit: "PIECE" as const, price: 8, quantity: 18, threshold: 6, barcode: "2800000000068", type: "INTERNAL" as const },
    { name: "Corned Beef, 150g", unit: "CAN" as const, price: 42, quantity: 10, threshold: 3, barcode: "4800024571501", type: "MANUFACTURER" as const },
    { name: "Bottled Water, 500ml", unit: "BOTTLE" as const, price: 15, quantity: 5, threshold: 5, barcode: "4800092555004", type: "MANUFACTURER" as const },
  ];
  for (const fixture of fixtures) {
    const existingProduct = await prisma.product.findFirst({ where: { storeId: membership.storeId, normalizedName: fixture.name.toLocaleLowerCase("en-PH") } });
    if (existingProduct) continue;
    await prisma.product.create({ data: { storeId: membership.storeId, name: fixture.name, normalizedName: fixture.name.toLocaleLowerCase("en-PH"), sellingUnit: fixture.unit, sellingPrice: fixture.price, lowStockThreshold: fixture.threshold,
      balance: { create: { storeId: membership.storeId, quantity: fixture.quantity } },
      barcodes: { create: { storeId: membership.storeId, assignedById: owner.id, value: fixture.barcode, normalizedValue: fixture.barcode, type: fixture.type } },
      movements: { create: { storeId: membership.storeId, actorId: owner.id, type: "OPENING", quantityDelta: fixture.quantity, previousQuantity: 0, resultingQuantity: fixture.quantity, sourceType: "SEED", correlationId: `seed-${fixture.barcode}` } } } });
  }
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
