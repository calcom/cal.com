-- CreateTable
CREATE TABLE "DestinationCalendar" (
    "id" SERIAL NOT NULL,
    "integration" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "userId" INTEGER,
    "bookingId" INTEGER,
    "eventTypeId" INTEGER,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DestinationCalendar.userId_unique" ON "DestinationCalendar"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationCalendar.bookingId_unique" ON "DestinationCalendar"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationCalendar.eventTypeId_unique" ON "DestinationCalendar"("eventTypeId");

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
