-- AlterTable
ALTER TABLE "CalendarSubscription" ADD COLUMN     "office365SubscriptionChangeType" TEXT,
ADD COLUMN     "office365SubscriptionExpiration" TEXT,
ADD COLUMN     "office365SubscriptionId" TEXT,
ADD COLUMN     "office365SubscriptionResource" TEXT;

-- CreateIndex
CREATE INDEX "CalendarSubscription_office365SubscriptionExpiration_syncEr_idx" ON "CalendarSubscription"("office365SubscriptionExpiration", "syncErrors", "backoffUntil");
