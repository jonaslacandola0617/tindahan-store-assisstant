ALTER TYPE "ReceiptStatus" ADD VALUE IF NOT EXISTS 'REVERSED';

CREATE TYPE "ReceiptUploadStatus" AS ENUM ('PENDING', 'UPLOADED', 'VALIDATED', 'FAILED');
CREATE TYPE "ReceiptExtractionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "Receipt"
  ADD COLUMN "supplierText" TEXT,
  ADD COLUMN "grandTotal" DECIMAL(12,2),
  ADD COLUMN "processingStartedAt" TIMESTAMP(3),
  ADD COLUMN "processedAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "reversedAt" TIMESTAMP(3),
  ADD COLUMN "duplicateWarning" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "duplicateOfId" TEXT,
  ADD COLUMN "duplicateAcknowledgedAt" TIMESTAMP(3),
  ADD COLUMN "lastErrorCode" TEXT,
  ADD COLUMN "correlationId" TEXT;

UPDATE "Receipt" SET "correlationId" = 'legacy-' || "id" WHERE "correlationId" IS NULL;
ALTER TABLE "Receipt" ALTER COLUMN "correlationId" SET NOT NULL;

ALTER TABLE "ReceiptFile"
  ADD COLUMN "originalFilename" TEXT,
  ADD COLUMN "width" INTEGER,
  ADD COLUMN "height" INTEGER,
  ADD COLUMN "uploadStatus" "ReceiptUploadStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "uploadedAt" TIMESTAMP(3),
  ADD COLUMN "validatedAt" TIMESTAMP(3),
  ADD COLUMN "retentionUntil" TIMESTAMP(3),
  ALTER COLUMN "sha256" DROP NOT NULL;

UPDATE "ReceiptFile" SET "originalFilename" = 'receipt-image' WHERE "originalFilename" IS NULL;
ALTER TABLE "ReceiptFile" ALTER COLUMN "originalFilename" SET NOT NULL;

ALTER TABLE "ReceiptExtraction"
  ADD COLUMN "providerOperationId" TEXT,
  ADD COLUMN "status" "ReceiptExtractionStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "rawText" TEXT,
  ADD COLUMN "normalizedData" JSONB,
  ADD COLUMN "internalConfidence" JSONB,
  ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "failureCategory" TEXT;

ALTER TABLE "ReceiptLine"
  ADD COLUMN "sourceOrder" INTEGER,
  ADD COLUMN "rawText" TEXT,
  ADD COLUMN "barcode" TEXT,
  ADD COLUMN "packagingText" TEXT,
  ADD COLUMN "reviewState" "ReceiptMatchStatus",
  ADD COLUMN "finalProductId" TEXT,
  ADD COLUMN "correctedQuantity" INTEGER,
  ADD COLUMN "finalQuantity" INTEGER,
  ADD COLUMN "confirmedUnitPrice" DECIMAL(12,2),
  ADD COLUMN "confirmedLineTotal" DECIMAL(12,2),
  ADD COLUMN "correctedById" TEXT,
  ADD COLUMN "correctedAt" TIMESTAMP(3);

WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "receiptId" ORDER BY "id")::INTEGER AS position
  FROM "ReceiptLine"
)
UPDATE "ReceiptLine" line
SET "sourceOrder" = ordered.position,
    "rawText" = line."rawName",
    "reviewState" = CASE WHEN line."excluded" THEN 'EXCLUDED'::"ReceiptMatchStatus" ELSE 'UNMATCHED'::"ReceiptMatchStatus" END
FROM ordered
WHERE ordered."id" = line."id";

ALTER TABLE "ReceiptLine"
  ALTER COLUMN "sourceOrder" SET NOT NULL,
  ALTER COLUMN "rawText" SET NOT NULL,
  ALTER COLUMN "reviewState" SET NOT NULL;

ALTER TABLE "ReceiptLineMatch"
  ADD COLUMN "source" TEXT,
  ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "userConfirmed" BOOLEAN NOT NULL DEFAULT false;
UPDATE "ReceiptLineMatch" SET "source" = 'LEGACY' WHERE "source" IS NULL;
ALTER TABLE "ReceiptLineMatch" ALTER COLUMN "source" SET NOT NULL;

ALTER TABLE "ReceiptConfirmation"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "payloadHash" TEXT,
  ADD COLUMN "includedLineCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "excludedLineCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "totalQuantity" INTEGER NOT NULL DEFAULT 0;
UPDATE "ReceiptConfirmation"
SET "idempotencyKey" = 'legacy-' || "id", "payloadHash" = 'legacy-' || "id"
WHERE "idempotencyKey" IS NULL OR "payloadHash" IS NULL;
ALTER TABLE "ReceiptConfirmation"
  ALTER COLUMN "idempotencyKey" SET NOT NULL,
  ALTER COLUMN "payloadHash" SET NOT NULL;

ALTER TABLE "InventoryMovement"
  ADD COLUMN "receiptLineId" TEXT,
  ADD COLUMN "receiptConfirmationId" TEXT;

ALTER TABLE "JobRun"
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "payloadHash" TEXT,
  ADD COLUMN "failureType" TEXT,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TABLE "ReceiptReversal" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "confirmationId" TEXT NOT NULL,
  "reversedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptReversal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReceiptAlias" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "normalizedText" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sourceReceiptId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReceiptAlias_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Receipt_storeId_duplicateWarning_createdAt_idx" ON "Receipt"("storeId", "duplicateWarning", "createdAt");
CREATE UNIQUE INDEX "ReceiptLine_receiptId_sourceOrder_key" ON "ReceiptLine"("receiptId", "sourceOrder");
CREATE INDEX "ReceiptLine_storeId_finalProductId_idx" ON "ReceiptLine"("storeId", "finalProductId");
CREATE INDEX "ReceiptLineMatch_storeId_productId_idx" ON "ReceiptLineMatch"("storeId", "productId");
CREATE UNIQUE INDEX "ReceiptConfirmation_storeId_idempotencyKey_key" ON "ReceiptConfirmation"("storeId", "idempotencyKey");
CREATE INDEX "InventoryMovement_storeId_receiptConfirmationId_idx" ON "InventoryMovement"("storeId", "receiptConfirmationId");
CREATE UNIQUE INDEX "ReceiptReversal_receiptId_key" ON "ReceiptReversal"("receiptId");
CREATE UNIQUE INDEX "ReceiptReversal_confirmationId_key" ON "ReceiptReversal"("confirmationId");
CREATE INDEX "ReceiptReversal_storeId_createdAt_idx" ON "ReceiptReversal"("storeId", "createdAt");
CREATE UNIQUE INDEX "ReceiptAlias_storeId_normalizedText_key" ON "ReceiptAlias"("storeId", "normalizedText");
CREATE INDEX "ReceiptAlias_storeId_productId_active_idx" ON "ReceiptAlias"("storeId", "productId", "active");
CREATE UNIQUE INDEX "JobRun_storeId_externalId_key" ON "JobRun"("storeId", "externalId");

ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_finalProductId_fkey" FOREIGN KEY ("finalProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptLine" ADD CONSTRAINT "ReceiptLine_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_receiptLineId_fkey" FOREIGN KEY ("receiptLineId") REFERENCES "ReceiptLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_receiptConfirmationId_fkey" FOREIGN KEY ("receiptConfirmationId") REFERENCES "ReceiptConfirmation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptReversal" ADD CONSTRAINT "ReceiptReversal_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptReversal" ADD CONSTRAINT "ReceiptReversal_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptReversal" ADD CONSTRAINT "ReceiptReversal_confirmationId_fkey" FOREIGN KEY ("confirmationId") REFERENCES "ReceiptConfirmation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptReversal" ADD CONSTRAINT "ReceiptReversal_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptAlias" ADD CONSTRAINT "ReceiptAlias_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptAlias" ADD CONSTRAINT "ReceiptAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptAlias" ADD CONSTRAINT "ReceiptAlias_sourceReceiptId_fkey" FOREIGN KEY ("sourceReceiptId") REFERENCES "Receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
