/*
  Warnings:

  - A unique constraint covering the columns `[referenceUid,type]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Task_succeededAt_idx" ON "Task"("succeededAt");

-- CreateIndex
CREATE INDEX "Task_scheduledAt_succeededAt_idx" ON "Task"("scheduledAt", "succeededAt");

-- CreateIndex
CREATE UNIQUE INDEX "Task_referenceUid_type_key" ON "Task"("referenceUid", "type");
