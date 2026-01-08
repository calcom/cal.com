-- AlterTable
ALTER TABLE "public"."TeamBilling" ADD COLUMN     "billingPeriod" "public"."BillingPeriod",
ADD COLUMN     "paidSeats" INTEGER,
ADD COLUMN     "pricePerSeat" INTEGER;
