-- DropForeignKey
ALTER TABLE "BookingReference" DROP CONSTRAINT "BookingReference_bookingId_fkey";

-- CreateTable
CREATE TABLE "HashedLink" (
    "id" SERIAL NOT NULL,
    "link" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,

    CONSTRAINT "HashedLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HashedLink_link_key" ON "HashedLink"("link");

-- CreateIndex
CREATE UNIQUE INDEX "HashedLink_eventTypeId_key" ON "HashedLink"("eventTypeId");

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HashedLink" ADD CONSTRAINT "HashedLink_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;