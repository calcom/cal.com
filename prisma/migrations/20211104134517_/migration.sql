-- CreateTable
CREATE TABLE "CalendarDestination" (
    "id" INTEGER NOT NULL,
    "integration" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CalendarDestination" ADD FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "DailyEventReference_bookingId_unique" RENAME TO "DailyEventReference.bookingId_unique";
