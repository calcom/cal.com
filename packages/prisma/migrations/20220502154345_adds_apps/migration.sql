-- CreateEnum
CREATE TYPE "AppCategories" AS ENUM ('calendar', 'messaging', 'other', 'payment', 'video', 'web3');

-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "appId" TEXT;

-- CreateTable
CREATE TABLE "App" (
    "slug" TEXT NOT NULL,
    "dirName" TEXT NOT NULL,
    "keys" JSONB,
    "categories" "AppCategories"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE UNIQUE INDEX "App_slug_key" ON "App"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "App_dirName_key" ON "App"("dirName");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- Connects each saved Credential to their respective App
UPDATE "Credential" SET "appId" = 'apple-calendar' WHERE "type" = 'apple_calendar';
UPDATE "Credential" SET "appId" = 'caldav-calendar' WHERE "type" = 'caldav_calendar';
UPDATE "Credential" SET "appId" = 'google-calendar' WHERE "type" = 'google_calendar';
UPDATE "Credential" SET "appId" = 'google-meet' WHERE "type" = 'google_video';
UPDATE "Credential" SET "appId" = 'office365-calendar' WHERE "type" = 'office365_calendar';
UPDATE "Credential" SET "appId" = 'msteams' WHERE "type" = 'office365_video';
UPDATE "Credential" SET "appId" = 'dailyvideo' WHERE "type" = 'daily_video';
UPDATE "Credential" SET "appId" = 'tandem' WHERE "type" = 'tandem_video';
UPDATE "Credential" SET "appId" = 'zoom' WHERE "type" = 'zoom_video';
UPDATE "Credential" SET "appId" = 'jitsi' WHERE "type" = 'jitsi_video';
UPDATE "Credential" SET "appId" = 'hubspot' WHERE "type" = 'hubspot_other_calendar';
UPDATE "Credential" SET "appId" = 'wipe-my-cal' WHERE "type" = 'wipemycal_other';
UPDATE "Credential" SET "appId" = 'huddle01' WHERE "type" = 'huddle01_video';
UPDATE "Credential" SET "appId" = 'slack' WHERE "type" = 'slack_messaging';
UPDATE "Credential" SET "appId" = 'stripe' WHERE "type" = 'stripe_payment';
