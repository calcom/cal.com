-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "startTime" DROP NOT NULL,
ALTER COLUMN "endTime" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "asyncUseCalendar" BOOLEAN NOT NULL DEFAULT false;
