-- CreateTable
CREATE TABLE "SelectedSlots" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "slotUtcStartDate" TIMESTAMP(3) NOT NULL,
    "slotUtcEndDate" TIMESTAMP(3) NOT NULL,
    "uid" TEXT NOT NULL,
    "releaseAt" TIMESTAMP(3) NOT NULL,
    "isSeat" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SelectedSlots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SelectedSlots_userId_slotUtcStartDate_slotUtcEndDate_uid_key" ON "SelectedSlots"("userId", "slotUtcStartDate", "slotUtcEndDate", "uid");
