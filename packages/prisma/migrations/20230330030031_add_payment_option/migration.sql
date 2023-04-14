-- CreateEnum
CREATE TYPE "PaymentOption" AS ENUM ('ON_BOOKING', 'HOLD');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentOption" "PaymentOption" DEFAULT 'ON_BOOKING';
