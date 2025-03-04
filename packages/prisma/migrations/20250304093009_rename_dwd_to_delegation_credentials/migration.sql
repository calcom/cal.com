/*
  Warnings:

  - You are about to drop the column `domainWideDelegationCredentialId` on the `BookingReference` table. All the data in the column will be lost.
  - You are about to drop the column `domainWideDelegationCredentialId` on the `DestinationCalendar` table. All the data in the column will be lost.
  - You are about to drop the column `domainWideDelegationCredentialId` on the `SelectedCalendar` table. All the data in the column will be lost.
  - You are about to drop the `DomainWideDelegation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BookingReference" DROP CONSTRAINT "BookingReference_domainWideDelegationCredentialId_fkey";

-- DropForeignKey
ALTER TABLE "DestinationCalendar" DROP CONSTRAINT "DestinationCalendar_domainWideDelegationCredentialId_fkey";

-- DropForeignKey
ALTER TABLE "DomainWideDelegation" DROP CONSTRAINT "DomainWideDelegation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "DomainWideDelegation" DROP CONSTRAINT "DomainWideDelegation_workspacePlatformId_fkey";

-- DropForeignKey
ALTER TABLE "SelectedCalendar" DROP CONSTRAINT "SelectedCalendar_domainWideDelegationCredentialId_fkey";

-- AlterTable
ALTER TABLE "BookingReference" DROP COLUMN "domainWideDelegationCredentialId",
ADD COLUMN     "delegationCredentialId" TEXT;

-- AlterTable
ALTER TABLE "DestinationCalendar" DROP COLUMN "domainWideDelegationCredentialId",
ADD COLUMN     "delegationCredentialId" TEXT;

-- AlterTable
ALTER TABLE "SelectedCalendar" DROP COLUMN "domainWideDelegationCredentialId",
ADD COLUMN     "delegationCredentialId" TEXT;

-- DropTable
DROP TABLE "DomainWideDelegation";

-- CreateTable
CREATE TABLE "DelegationCredential" (
    "id" TEXT NOT NULL,
    "workspacePlatformId" INTEGER NOT NULL,
    "serviceAccountKey" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DelegationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DelegationCredential_organizationId_domain_key" ON "DelegationCredential"("organizationId", "domain");

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD CONSTRAINT "DestinationCalendar_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "DelegationCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "DelegationCredential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "DelegationCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationCredential" ADD CONSTRAINT "DelegationCredential_workspacePlatformId_fkey" FOREIGN KEY ("workspacePlatformId") REFERENCES "WorkspacePlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationCredential" ADD CONSTRAINT "DelegationCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
