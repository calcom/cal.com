-- CreateTable
CREATE TABLE "SlotsCache" (
    "id" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "slotTime" TIMESTAMP(3) NOT NULL,
    "date" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "availableCount" INTEGER NOT NULL,
    "totalHosts" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlotsCache_eventTypeId_date_idx" ON "SlotsCache"("eventTypeId", "date");

-- CreateIndex
CREATE INDEX "SlotsCache_eventTypeId_month_idx" ON "SlotsCache"("eventTypeId", "month");

-- CreateIndex
CREATE INDEX "SlotsCache_expiresAt_idx" ON "SlotsCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlotsCache_eventTypeId_slotTime_key" ON "SlotsCache"("eventTypeId", "slotTime");
