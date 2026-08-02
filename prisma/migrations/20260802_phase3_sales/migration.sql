ALTER TYPE "SaleStatus" ADD VALUE IF NOT EXISTS 'CORRECTED';

ALTER TABLE "Sale" ADD COLUMN "totalQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "correlationId" TEXT;
ALTER TABLE "SaleLine" ADD COLUMN "otherUnitSnapshot" TEXT;

UPDATE "Sale" sale
SET "totalQuantity" = totals.quantity
FROM (
  SELECT "saleId", COALESCE(SUM("quantity"), 0)::INTEGER AS quantity
  FROM "SaleLine"
  GROUP BY "saleId"
) totals
WHERE totals."saleId" = sale."id";

CREATE INDEX "Sale_storeId_confirmedAt_idx" ON "Sale"("storeId", "confirmedAt");

CREATE TABLE "SaleCorrection" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SaleCorrection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SaleCorrection_saleId_key" ON "SaleCorrection"("saleId");
CREATE INDEX "SaleCorrection_storeId_createdAt_idx" ON "SaleCorrection"("storeId", "createdAt");
CREATE INDEX "SaleCorrection_actorId_idx" ON "SaleCorrection"("actorId");
ALTER TABLE "SaleCorrection" ADD CONSTRAINT "SaleCorrection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleCorrection" ADD CONSTRAINT "SaleCorrection_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleCorrection" ADD CONSTRAINT "SaleCorrection_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
