-- CreateTable
CREATE TABLE "SelectedSlots" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "slotUtcDate" TIMESTAMP(3) NOT NULL,
    "uid" TEXT NOT NULL,
    "releaseAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelectedSlots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SelectedSlots_eventTypeId_slotUtcDate_uid_key" ON "SelectedSlots"("eventTypeId", "slotUtcDate", "uid");
