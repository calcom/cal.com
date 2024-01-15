/*
  Warnings:

  - You are about to drop the column `ownedByOrganizationId` on the `Availability` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_ownedByOrganizationId_fkey";

-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "ownedByOrganizationId";
