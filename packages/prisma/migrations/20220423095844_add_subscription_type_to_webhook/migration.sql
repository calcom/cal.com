/*
  Warnings:

  - Added the required column `subscriptionType` to the `Webhook` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('WEBHOOK', 'ZAPIER');

-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "subscriptionType" "SubscriptionType" NOT NULL;
