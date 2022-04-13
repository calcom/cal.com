-- CreateEnum
CREATE TYPE "BookingLimitType" AS ENUM ('month', 'day', 'week');

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "seatsPerTimeSlot" INTEGER;

