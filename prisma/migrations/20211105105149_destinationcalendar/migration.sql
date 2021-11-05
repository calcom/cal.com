-- CreateTable
CREATE TABLE "UserDestinationCalendar" (
    "id" INTEGER NOT NULL,
    "integration" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingDestinationCalendar" (
    "id" INTEGER NOT NULL,
    "integration" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserDestinationCalendar" ADD FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDestinationCalendar" ADD FOREIGN KEY ("id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
