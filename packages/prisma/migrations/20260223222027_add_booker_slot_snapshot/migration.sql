-- CreateTable
CREATE TABLE "public"."BookerSlotSnapshot" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "firstSlotLeadTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookerSlotSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookerSlotSnapshot_eventTypeId_idx" ON "public"."BookerSlotSnapshot"("eventTypeId");

-- CreateIndex
CREATE INDEX "BookerSlotSnapshot_createdAt_idx" ON "public"."BookerSlotSnapshot"("createdAt");
