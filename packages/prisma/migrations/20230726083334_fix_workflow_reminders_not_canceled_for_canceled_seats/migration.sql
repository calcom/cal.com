-- AlterTable
ALTER TABLE "WorkflowReminder" ADD COLUMN     "seatReferenceId" TEXT;

-- CreateIndex
CREATE INDEX "WorkflowReminder_seatReferenceId_idx" ON "WorkflowReminder"("seatReferenceId");
