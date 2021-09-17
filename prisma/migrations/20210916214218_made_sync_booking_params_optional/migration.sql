-- AlterTable
ALTER TABLE "Attendee" ALTER COLUMN "timeZone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "startTime" DROP NOT NULL,
ALTER COLUMN "endTime" DROP NOT NULL;
