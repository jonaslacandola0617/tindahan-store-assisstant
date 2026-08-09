import { database } from "../src/platform/persistence/prisma";
import { assertReceiptObjectKey, receiptStorage } from "../src/platform/storage/receipt-storage";
import { logger } from "../src/platform/logging/logger";

const execute = process.argv.includes("--execute");
const batchArgument = process.argv.find(value => value.startsWith("--batch="));
const batch = Math.min(500, Math.max(1, Number(batchArgument?.split("=")[1] ?? 100)));

async function main() {
  const db = database();
  const files = await db.receiptFile.findMany({
    where: { retentionUntil: { lte: new Date() }, purgedAt: null, uploadStatus: { in: ["UPLOADED", "VALIDATED", "FAILED"] } },
    orderBy: { retentionUntil: "asc" },
    take: batch,
    select: { id: true, storeId: true, receiptId: true, objectKey: true, retentionUntil: true },
  });

  if (!execute) {
    console.info(JSON.stringify({ mode: "dry-run", eligibleFiles: files.length, batch }));
    return;
  }

  let purged = 0;
  for (const file of files) {
    assertReceiptObjectKey(file.objectKey, file.storeId);
    await receiptStorage().deleteObject(file.objectKey);
    const updated = await db.receiptFile.updateMany({ where: { id: file.id, purgedAt: null }, data: { purgedAt: new Date() } });
    if (updated.count === 1) {
      purged += 1;
      logger.info("receipt_photo_retention_enforced", { storeId: file.storeId, receiptId: file.receiptId, retentionUntil: file.retentionUntil });
    }
  }
  console.info(JSON.stringify({ mode: "execute", eligibleFiles: files.length, purged }));
}

main().catch(error => {
  logger.error("receipt_retention_failed", { error });
  process.exitCode = 1;
}).finally(async () => database().$disconnect());
