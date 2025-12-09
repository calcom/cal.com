-- CreateEnum
CREATE TYPE "public"."NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateTable
CREATE TABLE "public"."UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "notificationType" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamNotificationPreference" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "notificationType" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserNotificationPreference_userId_idx" ON "public"."UserNotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "UserNotificationPreference_notificationType_idx" ON "public"."UserNotificationPreference"("notificationType");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_notificationType_key" ON "public"."UserNotificationPreference"("userId", "notificationType");

-- CreateIndex
CREATE INDEX "TeamNotificationPreference_teamId_idx" ON "public"."TeamNotificationPreference"("teamId");

-- CreateIndex
CREATE INDEX "TeamNotificationPreference_notificationType_idx" ON "public"."TeamNotificationPreference"("notificationType");

-- CreateIndex
CREATE UNIQUE INDEX "TeamNotificationPreference_teamId_notificationType_key" ON "public"."TeamNotificationPreference"("teamId", "notificationType");

-- AddForeignKey
ALTER TABLE "public"."UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamNotificationPreference" ADD CONSTRAINT "TeamNotificationPreference_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert notification-center feature flag
INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'notification-center',
    false,
    'Enable notification center and preference management for this instance',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
