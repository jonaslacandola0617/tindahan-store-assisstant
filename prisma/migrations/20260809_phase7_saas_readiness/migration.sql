CREATE TYPE "PlanCode" AS ENUM ('PILOT', 'TRIAL', 'STANDARD');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'GRACE', 'RESTRICTED', 'CANCELED');

ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "StorePreference" ADD COLUMN "receiptRetentionDays" INTEGER NOT NULL DEFAULT 2555;

CREATE TABLE "StoreSubscription" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "plan" "PlanCode" NOT NULL DEFAULT 'TRIAL',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "trialEndsAt" TIMESTAMP(3),
  "currentPeriodEndsAt" TIMESTAMP(3),
  "graceEndsAt" TIMESTAMP(3),
  "externalCustomerId" TEXT,
  "externalSubscriptionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffInvitation" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL DEFAULT 'STAFF',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoreSubscription_storeId_key" ON "StoreSubscription"("storeId");
CREATE INDEX "StoreSubscription_status_trialEndsAt_idx" ON "StoreSubscription"("status", "trialEndsAt");
CREATE UNIQUE INDEX "StaffInvitation_tokenHash_key" ON "StaffInvitation"("tokenHash");
CREATE INDEX "StaffInvitation_storeId_email_createdAt_idx" ON "StaffInvitation"("storeId", "email", "createdAt");
CREATE INDEX "StaffInvitation_storeId_expiresAt_idx" ON "StaffInvitation"("storeId", "expiresAt");

ALTER TABLE "StoreSubscription" ADD CONSTRAINT "StoreSubscription_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing pilot stores retain uninterrupted access. Only newly created stores
-- begin in a configurable trial through the application service.
INSERT INTO "StoreSubscription" ("id", "storeId", "plan", "status", "createdAt", "updatedAt")
SELECT 'phase7_' || substr(md5("id"), 1, 24), "id", 'PILOT', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Store"
ON CONFLICT ("storeId") DO NOTHING;
