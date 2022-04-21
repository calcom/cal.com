/*
  Warnings:

  - You are about to drop the column `TriggerEvent` on the `ZapierSubscription` table. All the data in the column will be lost.
  - Added the required column `triggerEvent` to the `ZapierSubscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ZapierSubscription" DROP COLUMN "TriggerEvent",
ADD COLUMN     "triggerEvent" "WebhookTriggerEvents" NOT NULL;
