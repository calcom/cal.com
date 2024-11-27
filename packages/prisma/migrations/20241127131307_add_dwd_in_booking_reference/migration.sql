-- AlterTable
ALTER TABLE "BookingReference" ADD COLUMN     "delegatedToId" TEXT;

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_delegatedToId_fkey" FOREIGN KEY ("delegatedToId") REFERENCES "DomainWideDelegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
