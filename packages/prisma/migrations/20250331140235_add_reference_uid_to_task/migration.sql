/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `WorkflowReminder` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "referenceUid" TEXT;

-- AlterTable
ALTER TABLE "WorkflowReminder" ADD COLUMN     "uuid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowReminder_uuid_key" ON "WorkflowReminder"("uuid");
