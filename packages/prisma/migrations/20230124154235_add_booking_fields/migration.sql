-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "responses" JSONB;

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "bookingFields" JSONB;
