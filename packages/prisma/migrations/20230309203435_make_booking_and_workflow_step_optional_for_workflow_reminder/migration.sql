-- DropForeignKey
ALTER TABLE "WorkflowReminder" DROP CONSTRAINT "WorkflowReminder_bookingUid_fkey";

-- DropForeignKey
ALTER TABLE "WorkflowReminder" DROP CONSTRAINT "WorkflowReminder_workflowStepId_fkey";

-- AlterTable
ALTER TABLE "WorkflowReminder" ALTER COLUMN "bookingUid" DROP NOT NULL,
ALTER COLUMN "workflowStepId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WorkflowReminder" ADD CONSTRAINT "WorkflowReminder_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowReminder" ADD CONSTRAINT "WorkflowReminder_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
