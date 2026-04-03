-- DropTable (from PR1, now replaced by generic NotificationPreference)
DROP TABLE IF EXISTS "UserNotificationPreferences";
DROP TABLE IF EXISTS "UserNotificationSettings";

-- These may not exist yet if PR1 hierarchy migration was never applied,
-- but DROP IF EXISTS is safe either way.
DROP TABLE IF EXISTS "TeamNotificationPreferences";
DROP TABLE IF EXISTS "TeamNotificationSettings";

-- CreateEnum
CREATE TYPE "NotificationPreferenceTargetType" AS ENUM ('USER', 'TEAM', 'ORGANIZATION');

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" SERIAL NOT NULL,
    "targetType" "NotificationPreferenceTargetType" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "booleanValue" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_targetType_targetId_key_key" ON "NotificationPreference"("targetType", "targetId", "key");

-- CreateIndex
CREATE INDEX "NotificationPreference_targetType_targetId_idx" ON "NotificationPreference"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "NotificationPreference_key_idx" ON "NotificationPreference"("key");
