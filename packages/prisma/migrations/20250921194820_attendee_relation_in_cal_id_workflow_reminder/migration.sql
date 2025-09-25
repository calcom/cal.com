-- AlterTable
ALTER TABLE "CalIdWorkflowReminder" ADD COLUMN     "attendeeId" INTEGER;

-- CreateIndex
CREATE INDEX "VerificationToken_calIdTeamId_idx" ON "VerificationToken"("calIdTeamId");

-- AddForeignKey
ALTER TABLE "CalIdWorkflowReminder" ADD CONSTRAINT "CalIdWorkflowReminder_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
