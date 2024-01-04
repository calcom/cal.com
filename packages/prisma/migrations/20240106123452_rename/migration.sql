/*
  Warnings:

  - You are about to drop the column `organizationId` on the `App_RoutingForms_Form` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `EventType` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `Workflow` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "App_RoutingForms_Form" DROP CONSTRAINT "App_RoutingForms_Form_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "EventType" DROP CONSTRAINT "EventType_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Workflow" DROP CONSTRAINT "Workflow_organizationId_fkey";

-- AlterTable
ALTER TABLE "App_RoutingForms_Form" DROP COLUMN "organizationId",
ADD COLUMN     "ownedByOrganizationId" INTEGER;

-- AlterTable
ALTER TABLE "EventType" DROP COLUMN "organizationId",
ADD COLUMN     "ownedByOrganizationId" INTEGER;

-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "organizationId",
ADD COLUMN     "ownedByOrganizationId" INTEGER;

-- AlterTable
ALTER TABLE "Workflow" DROP COLUMN "organizationId",
ADD COLUMN     "ownedByOrganizationId" INTEGER;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_ownedByOrganizationId_fkey" FOREIGN KEY ("ownedByOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_ownedByOrganizationId_fkey" FOREIGN KEY ("ownedByOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App_RoutingForms_Form" ADD CONSTRAINT "App_RoutingForms_Form_ownedByOrganizationId_fkey" FOREIGN KEY ("ownedByOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_ownedByOrganizationId_fkey" FOREIGN KEY ("ownedByOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
