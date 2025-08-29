-- AlterTable
ALTER TABLE "WorkflowReminder" ADD COLUMN     "attendeeId" INTEGER;

-- AddForeignKey
ALTER TABLE "WorkflowReminder" ADD CONSTRAINT "WorkflowReminder_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
