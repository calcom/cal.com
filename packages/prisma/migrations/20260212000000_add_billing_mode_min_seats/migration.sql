-- AlterTable
ALTER TABLE "OrganizationOnboarding" ADD COLUMN "billingMode" "BillingMode" NOT NULL DEFAULT 'SEATS';
ALTER TABLE "OrganizationOnboarding" ADD COLUMN "minSeats" INTEGER;

-- AlterTable
ALTER TABLE "TeamBilling" ADD COLUMN "minSeats" INTEGER;

-- AlterTable
ALTER TABLE "OrganizationBilling" ADD COLUMN "minSeats" INTEGER;
