/*
  Warnings:

  - Added the required column `stripeCustomerId` to the `Team` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripeSubscriptionId` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "stripeCustomerId" TEXT NOT NULL,
ADD COLUMN     "stripeSubscriptionId" TEXT NOT NULL;
