CREATE TYPE "BillingTransactionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELED');
CREATE TYPE "BillingWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "StoreSubscription"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "currentPeriodStartsAt" TIMESTAMP(3),
  ADD COLUMN "canceledAt" TIMESTAMP(3),
  ADD COLUMN "lastProviderEventAt" TIMESTAMP(3);

CREATE TABLE "BillingCustomer" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerCustomerId" TEXT NOT NULL,
  "billingName" TEXT NOT NULL,
  "billingEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingTransaction" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerTransactionId" TEXT NOT NULL,
  "status" "BillingTransactionStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PHP',
  "periodStartsAt" TIMESTAMP(3),
  "periodEndsAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingStatement" (
  "id" TEXT NOT NULL,
  "statementNumber" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "transactionId" TEXT,
  "plan" "PlanCode" NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'PHP',
  "subtotal" DECIMAL(12,2) NOT NULL,
  "tax" DECIMAL(12,2) NOT NULL,
  "total" DECIMAL(12,2) NOT NULL,
  "lineItems" JSONB NOT NULL,
  "taxSnapshot" JSONB NOT NULL,
  "periodStartsAt" TIMESTAMP(3),
  "periodEndsAt" TIMESTAMP(3),
  "paymentStatus" "BillingTransactionStatus" NOT NULL,
  "providerReference" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingStatement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "status" "BillingWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
  "storeId" TEXT,
  "errorCode" TEXT,
  "providerCreatedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailDelivery" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "userId" TEXT,
  "invitationId" TEXT,
  "kind" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "failureCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCustomer_storeId_key" ON "BillingCustomer"("storeId");
CREATE UNIQUE INDEX "BillingCustomer_provider_providerCustomerId_key" ON "BillingCustomer"("provider", "providerCustomerId");
CREATE UNIQUE INDEX "BillingTransaction_provider_providerTransactionId_key" ON "BillingTransaction"("provider", "providerTransactionId");
CREATE INDEX "BillingTransaction_storeId_createdAt_idx" ON "BillingTransaction"("storeId", "createdAt");
CREATE UNIQUE INDEX "BillingStatement_statementNumber_key" ON "BillingStatement"("statementNumber");
CREATE UNIQUE INDEX "BillingStatement_transactionId_key" ON "BillingStatement"("transactionId");
CREATE INDEX "BillingStatement_storeId_createdAt_idx" ON "BillingStatement"("storeId", "createdAt");
CREATE UNIQUE INDEX "BillingWebhookEvent_provider_providerEventId_key" ON "BillingWebhookEvent"("provider", "providerEventId");
CREATE INDEX "BillingWebhookEvent_status_receivedAt_idx" ON "BillingWebhookEvent"("status", "receivedAt");
CREATE UNIQUE INDEX "EmailDelivery_idempotencyKey_key" ON "EmailDelivery"("idempotencyKey");
CREATE INDEX "EmailDelivery_storeId_createdAt_idx" ON "EmailDelivery"("storeId", "createdAt");
CREATE INDEX "EmailDelivery_invitationId_createdAt_idx" ON "EmailDelivery"("invitationId", "createdAt");

ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "StoreSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingStatement" ADD CONSTRAINT "BillingStatement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingStatement" ADD CONSTRAINT "BillingStatement_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "StoreSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingStatement" ADD CONSTRAINT "BillingStatement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "BillingTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailDelivery" ADD CONSTRAINT "EmailDelivery_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "StaffInvitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
