/*
  Warnings:

  - A unique constraint covering the columns `[attendeeId]` on the table `BookingSeatsReferences` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BookingSeatsReferences_attendeeId_key" ON "BookingSeatsReferences"("attendeeId");
