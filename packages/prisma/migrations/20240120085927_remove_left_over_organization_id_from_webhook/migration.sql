/*
  Warnings:

  - You are about to drop the column `organizationId` on the `Webhook` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_organizationId_fkey";

-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "organizationId";
