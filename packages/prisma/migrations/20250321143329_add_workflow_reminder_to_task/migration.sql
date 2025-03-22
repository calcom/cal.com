/*
  Warnings:

  - A unique constraint covering the columns `[taskId]` on the table `WorkflowReminder` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "WorkflowReminder" ADD COLUMN     "taskId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowReminder_taskId_key" ON "WorkflowReminder"("taskId");

-- AddForeignKey
ALTER TABLE "WorkflowReminder" ADD CONSTRAINT "WorkflowReminder_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
