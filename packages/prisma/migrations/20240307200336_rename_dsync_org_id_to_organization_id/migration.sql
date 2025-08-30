/*
  Warnings:

  - You are about to drop the column `orgId` on the `DSyncData` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId]` on the table `DSyncData` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "DSyncData" DROP CONSTRAINT "DSyncData_orgId_fkey";

-- DropIndex
DROP INDEX "DSyncData_orgId_key";

-- AlterTable
ALTER TABLE "DSyncData" DROP COLUMN "orgId",
ADD COLUMN     "organizationId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "DSyncData_organizationId_key" ON "DSyncData"("organizationId");

-- AddForeignKey
ALTER TABLE "DSyncData" ADD CONSTRAINT "DSyncData_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
