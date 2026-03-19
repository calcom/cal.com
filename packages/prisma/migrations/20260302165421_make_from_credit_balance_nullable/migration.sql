-- DropForeignKey
ALTER TABLE "public"."CreditTransferLog" DROP CONSTRAINT "CreditTransferLog_fromCreditBalanceId_fkey";

-- AlterTable
ALTER TABLE "public"."CreditTransferLog" ALTER COLUMN "fromCreditBalanceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."CreditTransferLog" ADD CONSTRAINT "CreditTransferLog_fromCreditBalanceId_fkey" FOREIGN KEY ("fromCreditBalanceId") REFERENCES "public"."CreditBalance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
