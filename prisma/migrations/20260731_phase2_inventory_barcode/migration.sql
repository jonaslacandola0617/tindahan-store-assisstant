CREATE TYPE "InventoryView" AS ENUM ('LIST', 'GRID');

ALTER TABLE "StorePreference" ADD COLUMN "inventoryView" "InventoryView" NOT NULL DEFAULT 'LIST';
ALTER TABLE "Product" ADD COLUMN "description" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN "previousQuantity" INTEGER;
UPDATE "InventoryMovement" SET "previousQuantity" = "resultingQuantity" - "quantityDelta" WHERE "previousQuantity" IS NULL;
ALTER TABLE "InventoryMovement" ALTER COLUMN "previousQuantity" SET NOT NULL;

ALTER TABLE "ProductBarcode" ADD COLUMN "assignedById" TEXT;
ALTER TABLE "ProductBarcode" ADD COLUMN "replacesId" TEXT;
UPDATE "ProductBarcode" barcode
SET "assignedById" = membership."userId"
FROM "StoreMembership" membership
WHERE membership."storeId" = barcode."storeId" AND membership."role" = 'OWNER' AND membership."status" = 'ACTIVE' AND barcode."assignedById" IS NULL;
ALTER TABLE "ProductBarcode" ALTER COLUMN "assignedById" SET NOT NULL;

ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductBarcode" ADD CONSTRAINT "ProductBarcode_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "ProductBarcode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Product_storeId_status_updatedAt_idx" ON "Product"("storeId", "status", "updatedAt");
CREATE INDEX "ProductBarcode_assignedById_idx" ON "ProductBarcode"("assignedById");
CREATE INDEX "ProductBarcode_replacesId_idx" ON "ProductBarcode"("replacesId");
