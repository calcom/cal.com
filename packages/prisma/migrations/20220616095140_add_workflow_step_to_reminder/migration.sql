/*
  Warnings:

  - You are about to drop the `WorkflowReminders` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WorkflowReminders" DROP CONSTRAINT "WorkflowReminders_bookingUid_fkey";

-- DropTable
DROP TABLE "WorkflowReminders";

-- CreateTable
CREATE TABLE "WorkflowReminder" (
    "id" SERIAL NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "sendTo" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "referenceId" TEXT,
    "scheduled" BOOLEAN NOT NULL,
    "workflowStepId" INTEGER NOT NULL,

    CONSTRAINT "WorkflowReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowReminder_workflowStepId_key" ON "WorkflowReminder"("workflowStepId");

-- AddForeignKey
ALTER TABLE "WorkflowReminder" ADD CONSTRAINT "WorkflowReminder_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowReminder" ADD CONSTRAINT "WorkflowReminder_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
