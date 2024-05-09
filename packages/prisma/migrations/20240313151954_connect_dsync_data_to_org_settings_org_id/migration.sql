/*
  Warnings:

  - A unique constraint covering the columns `[directoryId]` on the table `DSyncData` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "DSyncData" DROP CONSTRAINT "DSyncData_organizationId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "DSyncData_directoryId_key" ON "DSyncData"("directoryId");

-- AddForeignKey
ALTER TABLE "DSyncData" ADD CONSTRAINT "DSyncData_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationSettings"("organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DSyncTeamGroupMapping" ADD CONSTRAINT "DSyncTeamGroupMapping_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "DSyncData"("directoryId") ON DELETE CASCADE ON UPDATE CASCADE;
