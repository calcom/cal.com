-- AlterTable
ALTER TABLE "OrganizationBilling" ADD COLUMN     "subscriptionEnd" TIMESTAMP(3),
ADD COLUMN     "subscriptionStart" TIMESTAMP(3),
ADD COLUMN     "subscriptionTrialEnd" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TeamBilling" ADD COLUMN     "subscriptionEnd" TIMESTAMP(3),
ADD COLUMN     "subscriptionStart" TIMESTAMP(3),
ADD COLUMN     "subscriptionTrialEnd" TIMESTAMP(3);
