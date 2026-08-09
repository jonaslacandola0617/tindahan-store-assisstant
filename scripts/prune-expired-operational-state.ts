import { database } from "../src/platform/persistence/prisma";
import { logger } from "../src/platform/logging/logger";

async function main() {
  const db = database();
  const now = new Date();
  const [rateLimits, idempotencyKeys] = await db.$transaction([
    db.rateLimitBucket.deleteMany({ where: { expiresAt: { lte: now } } }),
    db.idempotencyKey.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);
  console.info(JSON.stringify({ prunedAt: now.toISOString(), rateLimitBuckets: rateLimits.count, expiredIdempotencyKeys: idempotencyKeys.count }));
}

main().catch(error => {
  logger.error("operational_state_prune_failed", { error });
  process.exitCode = 1;
}).finally(async () => database().$disconnect());
