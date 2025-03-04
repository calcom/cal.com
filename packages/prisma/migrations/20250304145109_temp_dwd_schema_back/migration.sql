/*
  Warnings:

  - You are about to drop the column `organizationId` on the `DomainWideDelegation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[domain]` on the table `DomainWideDelegation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DomainWideDelegation_organizationId_domain_key";

-- AlterTable
ALTER TABLE "DomainWideDelegation" DROP COLUMN "organizationId";

-- CreateIndex
CREATE UNIQUE INDEX "DomainWideDelegation_domain_key" ON "DomainWideDelegation"("domain");

-- AddForeignKey
ALTER TABLE "DomainWideDelegation" ADD CONSTRAINT "DomainWideDelegation_workspacePlatformId_fkey" FOREIGN KEY ("workspacePlatformId") REFERENCES "WorkspacePlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
