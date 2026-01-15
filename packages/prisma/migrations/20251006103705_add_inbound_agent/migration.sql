/*
  Warnings:

  - A unique constraint covering the columns `[inboundAgentId]` on the table `WorkflowStep` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "inboundEventTypeId" INTEGER;

-- AlterTable
ALTER TABLE "WorkflowStep" ADD COLUMN     "inboundAgentId" TEXT;

-- CreateIndex
CREATE INDEX "Agent_inboundEventTypeId_idx" ON "Agent"("inboundEventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStep_inboundAgentId_key" ON "WorkflowStep"("inboundAgentId");

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_inboundAgentId_fkey" FOREIGN KEY ("inboundAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
