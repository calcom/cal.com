-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "disableCancelling" BOOLEAN DEFAULT false,
ADD COLUMN     "disableRescheduling" BOOLEAN DEFAULT false;
