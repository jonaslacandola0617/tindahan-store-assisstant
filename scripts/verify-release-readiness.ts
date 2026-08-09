import { database } from "../src/platform/persistence/prisma";
import { logger } from "../src/platform/logging/logger";

async function main() {
  const db = database();
  await db.$queryRaw`SELECT 1`;

  const [balances, movementTotals, storesWithoutOwner, confirmedReceiptsWithoutConfirmation, confirmedSalesWithoutLines, failedJobs, expiredRateLimits, failedBillingWebhooks, staleBillingWebhooks, failedEmailDeliveries, paidTransactionsWithoutStatement] = await Promise.all([
    db.inventoryBalance.findMany({ select: { storeId: true, productId: true, quantity: true } }),
    db.inventoryMovement.groupBy({ by: ["storeId", "productId"], _sum: { quantityDelta: true } }),
    db.store.count({ where: { memberships: { none: { role: "OWNER", status: "ACTIVE" } } } }),
    db.receipt.count({ where: { status: "CONFIRMED", confirmation: null } }),
    db.sale.count({ where: { status: "CONFIRMED", lines: { none: {} } } }),
    db.jobRun.count({ where: { status: "FAILED" } }),
    db.rateLimitBucket.count({ where: { expiresAt: { lte: new Date() } } }),
    db.billingWebhookEvent.count({ where: { status: "FAILED" } }),
    db.billingWebhookEvent.count({ where: { status: "RECEIVED", receivedAt: { lt: new Date(Date.now() - 15 * 60_000) } } }),
    db.emailDelivery.count({ where: { status: "FAILED" } }),
    db.billingTransaction.count({ where: { status: "PAID", statement: null } }),
  ]);

  const movementByProduct = new Map(movementTotals.map(row => [`${row.storeId}:${row.productId}`, row._sum.quantityDelta ?? 0]));
  const balanceMismatches = balances.filter(balance => balance.quantity !== (movementByProduct.get(`${balance.storeId}:${balance.productId}`) ?? 0));
  const failures = {
    storesWithoutOwner,
    balanceMismatches: balanceMismatches.length,
    confirmedReceiptsWithoutConfirmation,
    confirmedSalesWithoutLines,
    paidTransactionsWithoutStatement,
  };
  const passed = Object.values(failures).every(value => value === 0);
  console.info(JSON.stringify({ status: passed ? "ready" : "failed", checkedAt: new Date().toISOString(), failures, advisory: { failedJobs, expiredRateLimits, failedBillingWebhooks, staleBillingWebhooks, failedEmailDeliveries } }));
  if (!passed) process.exitCode = 1;
}

main().catch(error => {
  logger.error("release_readiness_verification_failed", { error });
  process.exitCode = 1;
}).finally(async () => database().$disconnect());
