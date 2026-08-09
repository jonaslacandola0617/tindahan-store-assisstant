UPDATE "StorePreference"
SET "receiptRetentionDays" = 365
WHERE "receiptRetentionDays" NOT IN (90, 180, 365);

ALTER TABLE "StorePreference"
ALTER COLUMN "receiptRetentionDays" SET DEFAULT 365;
