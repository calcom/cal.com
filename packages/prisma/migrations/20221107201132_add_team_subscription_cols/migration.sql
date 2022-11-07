/*
  Warnings:

  - Added the required column `subscriptionStatus` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL,
ALTER COLUMN "slug" DROP NOT NULL;
