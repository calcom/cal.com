-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "minimumCancelNotice" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN     "minimumRescheduleNotice" INTEGER NOT NULL DEFAULT 120;
