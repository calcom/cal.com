-- CreateTable
CREATE TABLE "BookingSeatsReferences" (
    "id" SERIAL NOT NULL,
    "referenceUId" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "attendeeId" INTEGER NOT NULL,
    "data" JSONB,

    CONSTRAINT "BookingSeatsReferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingSeatsReferences_referenceUId_key" ON "BookingSeatsReferences"("referenceUId");

-- AddForeignKey
ALTER TABLE "BookingSeatsReferences" ADD CONSTRAINT "BookingSeatsReferences_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSeatsReferences" ADD CONSTRAINT "BookingSeatsReferences_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
