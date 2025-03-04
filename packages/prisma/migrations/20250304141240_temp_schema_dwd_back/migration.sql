-- AlterTable
ALTER TABLE "BookingReference" ADD COLUMN     "domainWideDelegationCredentialId" TEXT;

-- AlterTable
ALTER TABLE "DestinationCalendar" ADD COLUMN     "domainWideDelegationCredentialId" TEXT;

-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "domainWideDelegationCredentialId" TEXT;

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
