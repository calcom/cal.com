-- AlterTable
ALTER TABLE "public"."Agent" ADD COLUMN     "outboundEventTypeId" INTEGER;

-- CreateIndex
CREATE INDEX "Agent_outboundEventTypeId_idx" ON "public"."Agent"("outboundEventTypeId");
