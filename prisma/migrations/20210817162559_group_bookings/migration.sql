-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "remainingSpots" INTEGER NOT NULL DEFAULT 0 CHECK("remainingSpots" > -1);
