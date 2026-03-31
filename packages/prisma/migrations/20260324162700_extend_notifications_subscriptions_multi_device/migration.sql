-- CreateEnum
CREATE TYPE "NotificationSubscriptionType" AS ENUM ('WEB_PUSH', 'APP_PUSH', 'SLACK', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "NotificationPlatform" AS ENUM ('WEB', 'IOS', 'ANDROID', 'SLACK', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "NotificationEvent" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'BOOKING_REQUESTED', 'BOOKING_REJECTED');

-- Step 1: Add new columns with safe defaults / nullable
ALTER TABLE "NotificationsSubscriptions" ADD COLUMN "type" "NotificationSubscriptionType" NOT NULL DEFAULT 'WEB_PUSH';
ALTER TABLE "NotificationsSubscriptions" ADD COLUMN "platform" "NotificationPlatform" NOT NULL DEFAULT 'WEB';
ALTER TABLE "NotificationsSubscriptions" ADD COLUMN "identifier" TEXT;
ALTER TABLE "NotificationsSubscriptions" ADD COLUMN "deviceId" TEXT;
ALTER TABLE "NotificationsSubscriptions" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "NotificationsSubscriptions" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "NotificationsSubscriptions" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Remove the default on updatedAt (Prisma @updatedAt handles this at the application level)
ALTER TABLE "NotificationsSubscriptions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Step 2: Backfill identifier from existing subscription JSON
UPDATE "NotificationsSubscriptions"
SET "identifier" = "subscription"::jsonb->>'endpoint'
WHERE "identifier" IS NULL;

-- Step 3: Fail loudly if any existing rows could not be backfilled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "NotificationsSubscriptions" WHERE "identifier" IS NULL) THEN
    RAISE EXCEPTION 'Unable to backfill NotificationsSubscriptions.identifier for all existing rows';
  END IF;
END $$;

-- Step 4: Make identifier non-nullable now that all rows have values
ALTER TABLE "NotificationsSubscriptions" ALTER COLUMN "identifier" SET NOT NULL;

-- Step 5: Drop old index, add new indexes and unique constraint
DROP INDEX IF EXISTS "NotificationsSubscriptions_userId_subscription_idx";
CREATE INDEX "NotificationsSubscriptions_userId_type_idx" ON "NotificationsSubscriptions"("userId", "type");
CREATE INDEX "NotificationsSubscriptions_type_identifier_idx" ON "NotificationsSubscriptions"("type", "identifier");
CREATE UNIQUE INDEX "NotificationsSubscriptions_userId_type_identifier_key" ON "NotificationsSubscriptions"("userId", "type", "identifier");

-- CreateTable
CREATE TABLE "UserNotificationSettings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationPreferences" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "event" "NotificationEvent" NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL,
    "appPushEnabled" BOOLEAN NOT NULL,
    "webPushEnabled" BOOLEAN NOT NULL,
    "slackEnabled" BOOLEAN NOT NULL,
    "telegramEnabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationSettings_userId_key" ON "UserNotificationSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreferences_userId_event_key" ON "UserNotificationPreferences"("userId", "event");

-- CreateIndex
CREATE INDEX "UserNotificationPreferences_event_idx" ON "UserNotificationPreferences"("event");

-- AddForeignKey
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationPreferences" ADD CONSTRAINT "UserNotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
