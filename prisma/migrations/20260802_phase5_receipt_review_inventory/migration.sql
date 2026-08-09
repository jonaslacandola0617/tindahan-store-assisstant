ALTER TYPE "ReceiptStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "ReceiptLine"
  ADD COLUMN "internalConfidence" DECIMAL(5,4);

CREATE TABLE "ReceiptRejection" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "rejectedById" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReceiptRejection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReceiptRejection_receiptId_key" ON "ReceiptRejection"("receiptId");
CREATE UNIQUE INDEX "ReceiptRejection_storeId_idempotencyKey_key" ON "ReceiptRejection"("storeId", "idempotencyKey");
CREATE INDEX "ReceiptRejection_storeId_createdAt_idx" ON "ReceiptRejection"("storeId", "createdAt");

ALTER TABLE "ReceiptRejection" ADD CONSTRAINT "ReceiptRejection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptRejection" ADD CONSTRAINT "ReceiptRejection_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReceiptRejection" ADD CONSTRAINT "ReceiptRejection_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
