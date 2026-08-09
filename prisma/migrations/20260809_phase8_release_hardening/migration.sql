-- Shared rate-limit state keeps abuse controls effective across application instances.
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "keyHash" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimitBucket_keyHash_key" ON "RateLimitBucket"("keyHash");
CREATE INDEX "RateLimitBucket_scope_expiresAt_idx" ON "RateLimitBucket"("scope", "expiresAt");
CREATE INDEX "RateLimitBucket_storeId_expiresAt_idx" ON "RateLimitBucket"("storeId", "expiresAt");

ALTER TABLE "RateLimitBucket"
ADD CONSTRAINT "RateLimitBucket_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReceiptFile" ADD COLUMN "purgedAt" TIMESTAMP(3);
CREATE INDEX "ReceiptFile_retentionUntil_purgedAt_idx" ON "ReceiptFile"("retentionUntil", "purgedAt");
