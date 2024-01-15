/*
  Warnings:

  - You are about to drop the column `ownedByOrganizationId` on the `App_RoutingForms_Form` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "App_RoutingForms_Form" DROP CONSTRAINT "App_RoutingForms_Form_ownedByOrganizationId_fkey";

-- AlterTable
ALTER TABLE "App_RoutingForms_Form" DROP COLUMN "ownedByOrganizationId";
