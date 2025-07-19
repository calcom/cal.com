/*
  Warnings:

  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `CalAiPhoneNumber` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PhoneNumberSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID');

-- AlterTable
ALTER TABLE "CalAiPhoneNumber" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" "PhoneNumberSubscriptionStatus";

-- CreateIndex
CREATE UNIQUE INDEX "CalAiPhoneNumber_stripeSubscriptionId_key" ON "CalAiPhoneNumber"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "CalAiPhoneNumber_stripeSubscriptionId_idx" ON "CalAiPhoneNumber"("stripeSubscriptionId");
