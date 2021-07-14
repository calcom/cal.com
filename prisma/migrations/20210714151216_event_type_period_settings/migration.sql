-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "periodCountCalendarDays" BOOLEAN,
ADD COLUMN     "periodDays" INTEGER,
ADD COLUMN     "periodEndDate" TIMESTAMP(3),
ADD COLUMN     "periodStartDate" TIMESTAMP(3),
ADD COLUMN     "periodType" TEXT DEFAULT E'unlimited';
