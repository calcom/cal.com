-- CreateEnum
CREATE TYPE "SMSAbuseEntityType" AS ENUM ('USER', 'TEAM', 'IP');

-- CreateTable
CREATE TABLE "SMSAbuseLock" (
    "id" SERIAL NOT NULL,
    "entityType" "SMSAbuseEntityType" NOT NULL,
    "entityIdentifier" TEXT NOT NULL,
    "lockState" "SMSLockState" NOT NULL DEFAULT 'UNLOCKED',
    "reason" TEXT,
    "provider" TEXT,
    "metadata" JSONB,
    "lockedAt" TIMESTAMP(3),
    "lastAlertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSAbuseLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SMSAbuseLock_entityType_entityIdentifier_key" ON "SMSAbuseLock"("entityType", "entityIdentifier");

-- CreateIndex
CREATE INDEX "SMSAbuseLock_entityType_lockState_idx" ON "SMSAbuseLock"("entityType", "lockState");
