-- DropForeignKey
ALTER TABLE "CalendarSync" DROP CONSTRAINT "CalendarSync_subscriptionId_fkey";

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CalendarSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
