-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('WEBHOOK', 'ZAPIER');

-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "subscriptionType" "SubscriptionType" NOT NULL DEFAULT E'WEBHOOK';
