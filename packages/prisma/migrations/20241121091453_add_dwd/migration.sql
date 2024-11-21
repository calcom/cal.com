/*
  Warnings:

  - You are about to drop the column `inErrorState` on the `DomainWideDelegation` table. All the data in the column will be lost.
  - You are about to drop the column `serviceAccountClientId` on the `DomainWideDelegation` table. All the data in the column will be lost.
  - You are about to drop the column `defaultServiceAccountClientId` on the `WorkspacePlatform` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "DomainWideDelegation_domain_key";

-- AlterTable
ALTER TABLE "DestinationCalendar" ADD COLUMN     "domainWideDelegationCredentialId" TEXT;

-- AlterTable
ALTER TABLE "DomainWideDelegation" DROP COLUMN "inErrorState",
DROP COLUMN "serviceAccountClientId";

-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "domainWideDelegationCredentialId" TEXT;

-- AlterTable
ALTER TABLE "WorkspacePlatform" DROP COLUMN "defaultServiceAccountClientId";

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD CONSTRAINT "DestinationCalendar_domainWideDelegationCredentialId_fkey" FOREIGN KEY ("domainWideDelegationCredentialId") REFERENCES "DomainWideDelegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_domainWideDelegationCredentialId_fkey" FOREIGN KEY ("domainWideDelegationCredentialId") REFERENCES "DomainWideDelegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
