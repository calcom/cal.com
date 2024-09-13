-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "delegatedToId" TEXT;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_delegatedToId_fkey" FOREIGN KEY ("delegatedToId") REFERENCES "DomainWideDelegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
