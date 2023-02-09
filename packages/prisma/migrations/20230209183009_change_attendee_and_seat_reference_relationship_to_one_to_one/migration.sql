/*
  Warnings:

  - A unique constraint covering the columns `[attendeeId]` on the table `BookingSeatsReferences` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "BookingSeatsReferences" DROP CONSTRAINT "BookingSeatsReferences_attendeeId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "BookingSeatsReferences_attendeeId_key" ON "BookingSeatsReferences"("attendeeId");

-- AddForeignKey
ALTER TABLE "BookingSeatsReferences" ADD CONSTRAINT "BookingSeatsReferences_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
