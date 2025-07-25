/*
  Warnings:

  - You are about to drop the column `selectedSlotId` on the `WebhookScheduledTriggers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "WebhookScheduledTriggers" DROP CONSTRAINT "WebhookScheduledTriggers_selectedSlotId_fkey";

-- AlterTable
ALTER TABLE "WebhookScheduledTriggers" DROP COLUMN "selectedSlotId";
