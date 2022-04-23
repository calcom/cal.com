-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "recurringEventId" TEXT;

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "recurringEvent" JSONB;
