-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rejected" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "requiresConfirmation" BOOLEAN NOT NULL DEFAULT false;
