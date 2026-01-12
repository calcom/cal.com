-- AlterEnum
ALTER TYPE "WorkflowStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "CalIdWorkflowInsights" ADD COLUMN     "bookingSeatReferenceUid" TEXT,
ADD COLUMN     "bookingUid" TEXT;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowInsights" ADD CONSTRAINT "CalIdWorkflowInsights_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdWorkflowInsights" ADD CONSTRAINT "CalIdWorkflowInsights_bookingSeatReferenceUid_fkey" FOREIGN KEY ("bookingSeatReferenceUid") REFERENCES "BookingSeat"("referenceUid") ON DELETE SET NULL ON UPDATE CASCADE;
