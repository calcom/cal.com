-- AlterTable
ALTER TABLE "WebhookScheduledTriggers" ADD COLUMN     "appId" TEXT,
ADD COLUMN     "bookingId" INTEGER,
ALTER COLUMN "jobName" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WebhookScheduledTriggers" ADD CONSTRAINT "WebhookScheduledTriggers_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
