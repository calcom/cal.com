/*
  Warnings:

  - You are about to drop the column `ownedByOrganizationId` on the `Credential` table. All the data in the column will be lost.
  - You are about to drop the column `ownedByOrganizationId` on the `EventType` table. All the data in the column will be lost.
  - You are about to drop the column `ownedByOrganizationId` on the `SelectedCalendar` table. All the data in the column will be lost.
  - You are about to drop the column `ownedByOrganizationId` on the `Webhook` table. All the data in the column will be lost.
  - You are about to drop the column `ownedByOrganizationId` on the `Workflow` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Credential" DROP CONSTRAINT "Credential_ownedByOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "EventType" DROP CONSTRAINT "EventType_ownedByOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "SelectedCalendar" DROP CONSTRAINT "SelectedCalendar_ownedByOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_ownedByOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "Workflow" DROP CONSTRAINT "Workflow_ownedByOrganizationId_fkey";

-- AlterTable
ALTER TABLE "Credential" DROP COLUMN "ownedByOrganizationId";

-- AlterTable
ALTER TABLE "EventType" DROP COLUMN "ownedByOrganizationId";

-- AlterTable
ALTER TABLE "SelectedCalendar" DROP COLUMN "ownedByOrganizationId";

-- AlterTable
ALTER TABLE "Webhook" DROP COLUMN "ownedByOrganizationId";

-- AlterTable
ALTER TABLE "Workflow" DROP COLUMN "ownedByOrganizationId";
