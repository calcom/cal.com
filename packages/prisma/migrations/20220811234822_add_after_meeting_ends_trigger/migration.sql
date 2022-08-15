-- AlterEnum
ALTER TYPE "WebhookTriggerEvents" ADD VALUE 'MEETING_ENDED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "scheduledJobs" TEXT[];
