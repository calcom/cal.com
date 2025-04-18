-- DropForeignKey
ALTER TABLE "EventType" DROP CONSTRAINT "EventType_secondaryEmailId_fkey";

-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "delegationCredentialId" TEXT;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_secondaryEmailId_fkey" FOREIGN KEY ("secondaryEmailId") REFERENCES "SecondaryEmail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "DelegationCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
