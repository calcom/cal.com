-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "office365SubscriptionClientState" TEXT,
ADD COLUMN     "office365SubscriptionExpiration" TEXT,
ADD COLUMN     "office365SubscriptionId" TEXT,
ADD COLUMN     "office365SubscriptionResource" TEXT;
