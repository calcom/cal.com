/*
  Warnings:

  - You are about to drop the column `bookingId` on the `DestinationCalendar` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DestinationCalendar" DROP CONSTRAINT IF EXISTS "DestinationCalendar_bookingId_fkey";

-- DropIndex
DROP INDEX "DestinationCalendar_bookingId_key";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "destinationCalendarId" INTEGER;

-- AlterTable
ALTER TABLE "BookingReference" ADD COLUMN     "credentialId" INTEGER;

-- AlterTable
ALTER TABLE "DestinationCalendar" DROP COLUMN "bookingId";

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_destinationCalendarId_fkey" FOREIGN KEY ("destinationCalendarId") REFERENCES "DestinationCalendar"("id") ON DELETE SET NULL ON UPDATE CASCADE;
