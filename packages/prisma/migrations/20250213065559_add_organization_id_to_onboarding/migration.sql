/*
  Warnings:

  - A unique constraint covering the columns `[organizationId]` on the table `OrganizationOnboarding` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "OrganizationOnboarding" ADD COLUMN     "organizationId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationOnboarding_organizationId_key" ON "OrganizationOnboarding"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationOnboarding" ADD CONSTRAINT "OrganizationOnboarding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
