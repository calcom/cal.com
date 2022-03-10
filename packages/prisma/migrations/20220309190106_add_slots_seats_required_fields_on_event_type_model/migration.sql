-- CreateEnum
CREATE TYPE "BookingLimitType" AS ENUM ('month', 'day', 'week');

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "bookingLimit" INTEGER,
ADD COLUMN     "bookingLimitType" "BookingLimitType",
ADD COLUMN     "seatsPerAttendee" INTEGER,
ADD COLUMN     "seatsPerTimeSlot" INTEGER;

