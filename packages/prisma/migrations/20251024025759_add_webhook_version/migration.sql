-- CreateEnum
CREATE TYPE "WebhookVersion" AS ENUM ('2021-10-20');

-- AlterTable
ALTER TABLE "public"."Webhook" ADD COLUMN     "version" "WebhookVersion" NOT NULL DEFAULT '2021-10-20';
