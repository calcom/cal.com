-- AlterTable
ALTER TABLE "BookingReference" ADD COLUMN     "domainWideDelegationCredentialId" TEXT;

-- AlterTable
ALTER TABLE "DestinationCalendar" ADD COLUMN     "domainWideDelegationCredentialId" TEXT;

-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "domainWideDelegationCredentialId" TEXT;

-- CreateTable
CREATE TABLE "DomainWideDelegation" (
    "id" TEXT NOT NULL,
    "workspacePlatformId" INTEGER NOT NULL,
    "serviceAccountKey" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainWideDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspacePlatform" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultServiceAccountKey" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkspacePlatform_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainWideDelegation_organizationId_domain_key" ON "DomainWideDelegation"("organizationId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePlatform_slug_key" ON "WorkspacePlatform"("slug");

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD CONSTRAINT "DestinationCalendar_domainWideDelegationCredentialId_fkey" FOREIGN KEY ("domainWideDelegationCredentialId") REFERENCES "DomainWideDelegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_domainWideDelegationCredentialId_fkey" FOREIGN KEY ("domainWideDelegationCredentialId") REFERENCES "DomainWideDelegation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_domainWideDelegationCredentialId_fkey" FOREIGN KEY ("domainWideDelegationCredentialId") REFERENCES "DomainWideDelegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainWideDelegation" ADD CONSTRAINT "DomainWideDelegation_workspacePlatformId_fkey" FOREIGN KEY ("workspacePlatformId") REFERENCES "WorkspacePlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainWideDelegation" ADD CONSTRAINT "DomainWideDelegation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
