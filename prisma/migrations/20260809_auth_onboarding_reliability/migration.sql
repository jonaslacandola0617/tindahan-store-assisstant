ALTER TABLE "Store"
ADD COLUMN "storeType" TEXT NOT NULL DEFAULT 'Sari-sari store';

ALTER TABLE "StorePreference"
ADD COLUMN "dailySummaryEnabled" BOOLEAN NOT NULL DEFAULT true;
