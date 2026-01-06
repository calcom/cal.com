-- AlterTable
ALTER TABLE "public"."OrganizationBilling" ADD COLUMN     "billingPeriod" "public"."BillingPeriod",
ADD COLUMN     "pricePerSeat" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."TeamBilling" ADD COLUMN     "billingPeriod" "public"."BillingPeriod",
ADD COLUMN     "pricePerSeat" DOUBLE PRECISION;
