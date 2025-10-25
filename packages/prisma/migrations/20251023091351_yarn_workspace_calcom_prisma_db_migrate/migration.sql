-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "outboundEventTypeId" INTEGER;

-- CreateIndex
CREATE INDEX "Agent_outboundEventTypeId_idx" ON "Agent"("outboundEventTypeId");
